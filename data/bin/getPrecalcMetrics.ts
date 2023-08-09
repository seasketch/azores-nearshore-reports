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
  metricId: string,
  geographyId: string
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
          pMetric.metricId === metricId &&
          pMetric.classId === datasourceId + "-" + curClass.classId &&
          pMetric.geographyId === geographyId
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
            metricId +
            ", " +
            geographyId
        );
      }

      // Returns metric, overwriting classId for easy match in report
      return { ...metric[0], classId: curClass.classId };
    }

    // else find metric for general, aka classId total, and add classId
    const metric = precalc.metrics.filter(function (pMetric) {
      return (
        pMetric.metricId === metricId &&
        pMetric.classId === datasourceId + "-total" &&
        pMetric.geographyId === geographyId
      );
    });

    if (!metric || !metric.length)
      throw new Error(
        `Can't find metric for datasource ${datasourceId}, geography ${geographyId}, stat ${metricId}`
      );
    if (metric.length > 1)
      throw new Error(
        `Returned multiple precalc metrics for datasource ${datasourceId}, geography ${geographyId}, stat ${metricId}`
      );

    // Returns metric, overwriting classId for easy match in report
    return { ...metric[0], classId: curClass.classId };
  });
  return createMetrics(metrics);
}

/**
 * Returns new metrics with their values transformed to percentage of corresponding totals
 * metrics are paired with total based on classId if present, falling back to metricId
 * Deep copies and maintains all other properties from the original metric
 * EDITS:
 * - totalsByKey maps based strictly on classId, because all precalc metrics have classId,
 * and this is checked
 * - subregions were causing some total metric values to be 0, and leading to a
 * division-by-zero error. Now, toPercentMetric() catches 0 denominators and returns 0% metric
 */
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

    // Adds check that classId != null
    if (!curMetric.classId)
      throw new Error(`No classId: ${JSON.stringify(curMetric)}`);

    // Get total precalc metric with matching classId
    const totalMetric = totalsByKey[curMetric.classId];
    if (!totalMetric) {
      throw new Error(`Missing total: ${JSON.stringify(curMetric)}`);
    }
    // Catches a 0 denominator and returns metric with 0%
    if (!totalMetric.value) {
      console.log(
        `${curMetric.classId} has no value within this planing area, returning 0%`
      );
      return {
        ...cloneDeep(curMetric),
        value: 0,
        ...(percMetricId ? { metricId: percMetricId } : {}),
      };
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
 * @param geographyId: geographyId
 * @returns display name of geography
 */
export const getGeographyDisplay = (geographyId: string): string => {
  const geography = geographies.find((g) => g.geographyId === geographyId);
  return geography ? geography.display : "Unknown";
};
