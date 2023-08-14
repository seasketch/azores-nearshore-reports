import {
  Metric,
  MetricGroup,
  createMetrics,
  keyBy,
} from "@seasketch/geoprocessing/client-core";
import precalc from "../../project/precalc.json";
import cloneDeep from "lodash/cloneDeep";
import path from "path";

/**
 * Extracts precalc metrics from precalc.json for a MetricGroup
 * @param mg MetricGroup to get precalculated metrics for
 * @param metricId string, "area", "count", or "sum"
 * @param geographyId string, geographyId to get precalculated metrics for
 * @returns Metric[] of precalculated metrics
 */
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

    // If class key (multiclass datasource), find that metric and return
    const classKey = mg.classKey! || curClass.classKey!;
    if (classKey) {
      const metric = precalc.metrics.filter(function (pMetric) {
        return (
          pMetric.metricId === metricId &&
          pMetric.classId === datasourceId + "-" + curClass.classId &&
          pMetric.geographyId === geographyId
        );
      });

      // Throw error if metric is unable to be found
      if (!metric || metric.length !== 1) {
        throw new Error(
          `No matching total metric for ${datasourceId}-${curClass.classId}, ${metricId}, ${geographyId}`
        );
      }

      // Returns metric, overwriting classId for easy match in report
      return { ...metric[0], classId: curClass.classId };
    }

    // Else find metric for general, aka classId total, and add classId
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
 * @param metrics Metric[] from sketch overlap, to be used as numerators
 * @param totals Metric[] from precalc, to be used as denominators
 * @param percMetricId string, optional, to overwrite metricId in outputted metrics
 * @returns Metric[] of percent values
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
 * Builds JSON path from dist folder path and datasourceId
 * @param dstPath string path to dist folder
 * @param datasourceId string id for datasource
 * @returns string path to datasource file
 */
export function getJsonPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".json";
}
