import {
  Metric,
  MetricGroup,
  createMetrics,
  keyBy,
} from "@seasketch/geoprocessing/client-core";
import geographies from "../../project/geographies.json";
import precalc from "../../project/precalc.json";
import cloneDeep from "lodash/cloneDeep";

export function getPrecalcMetrics(
  mg: MetricGroup,
  stat: string,
  geography: string
): Metric[] {
  // For each class in the metric group
  const metrics = mg.classes.map((curClass) => {
    if (!mg.datasourceId && !curClass.datasourceId)
      throw new Error(`Missing datasourceId for ${mg.metricId}`);

    // datasourceId used to find precalc metric
    const datasourceId = mg.datasourceId! || curClass.datasourceId!;

    const classKey = mg.classKey! || curClass.classKey!;
    // If class key (multiclass datasource), find that metric and return
    if (classKey) {
      const metric = precalc.metrics.filter(function (pMetric) {
        return (
          pMetric.metricId === stat &&
          pMetric.classId === datasourceId + "-" + curClass.classId &&
          pMetric.geographyId === geography
        );
      });
      if (!metric) throw new Error(`Can't find metric for ${datasourceId}`);
      if (metric.length !== 1) {
        throw new Error(
          "Reports are unable to find matching total metric for " +
            datasourceId +
            "-" +
            curClass.classId +
            ", " +
            stat +
            ", " +
            geography
        );
      }

      // Returns metric, overwriting classId for easy match in report
      return { ...metric[0], classId: curClass.classId };
    }

    // else find metric for general, aka classId total, and add classId
    const metric = precalc.metrics.filter(function (pMetric) {
      return (
        pMetric.metricId === stat &&
        pMetric.classId === datasourceId + "-total" &&
        pMetric.geographyId === geography
      );
    });

    if (!metric || !metric.length)
      throw new Error(
        `Can't find metric for datasource ${datasourceId}, geography ${geography}, stat ${stat}`
      );
    if (metric.length > 1)
      throw new Error(
        `Returned multiple precalc metrics for datasource ${datasourceId}, geography ${geography}, stat ${stat}`
      );

    // Returns metric, overwriting classId for easy match in report
    return { ...metric[0], classId: curClass.classId };
  });
  return createMetrics(metrics);
}

export const toPercentMetric = (
  metrics: Metric[],
  totals: Metric[],
  /** Set percent metrics with new metricId.  Defaults to leaving the same */
  percMetricId?: string
): Metric[] => {
  // Index into precalc totals using classId
  const totalsByKey = (() => {
    return keyBy(totals, (total) => String(total.classId));
  })();

  // For each metric in metric group
  return metrics.map((curMetric) => {
    if (!curMetric || curMetric.value === undefined)
      throw new Error(`Malformed metrics: ${JSON.stringify(curMetric)}`);

    if (!curMetric.classId)
      throw new Error(`No classId: ${JSON.stringify(curMetric)}`);

    // Get total precalc metric with matching classId
    const totalMetric = totalsByKey[curMetric.classId];
    if (!totalMetric) {
      throw new Error(`Missing total: ${JSON.stringify(curMetric)}`);
    }
    if (!totalMetric.value) {
      console.log(
        `${curMetric.classId} has no value within this planing area, replacing with .0001`
      );
      totalMetric.value = 0.0001;
    }

    // Returns percentage metric and adds new metricId if requested
    return {
      ...cloneDeep(curMetric),
      value: curMetric.value / totalMetric.value,
      ...(percMetricId ? { metricId: percMetricId } : {}),
    };
  });
};

/**
 * Takes geographyId and returns display name for report UI
 * @param geography: geographyId
 * @returns display name of geography
 */
export const getGeographyDisplay = (geography: string): string => {
  const geo = geographies.find((g) => g.geographyId === geography);
  return geo ? geo.display : "Unknown";
};
