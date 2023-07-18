import {
  Metric,
  MetricGroup,
  createMetrics,
  keyBy,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";
import precalc from "../../project/precalc.json";
import cloneDeep from "lodash/cloneDeep";

export function getPrecalcMetrics(
  mg: MetricGroup,
  stat: string,
  geography: string,
  classKey?: string
): Metric[] {
  const metrics = mg.classes.map((curClass) => {
    if (!mg.datasourceId && !curClass.datasourceId)
      throw new Error(`Missing datasourceId for ${mg.metricId}`);

    const ds = project.getDatasourceById(
      mg.datasourceId! || curClass.datasourceId!
    );

    const classKey = mg.classKey! || curClass.classKey!;
    // If class key, find that metric and return
    if (classKey) {
      const metric = precalc.metrics.filter(function (m) {
        return (
          m.metricId === stat &&
          m.extra.datasourceId === ds.datasourceId &&
          m.classId === curClass.classId &&
          m.geographyId === geography
        );
      });
      if (!metric) throw new Error(`Can't find metric for ${ds.datasourceId}`);
      if (metric.length !== 1)
        throw new Error(`Returned multiple precalc metrics ${ds.datasourceId}`);
      return metric[0];
    }

    // else find metric for general, aka classId null, and add classId
    const metric = precalc.metrics.filter(function (m) {
      return (
        m.metricId === stat &&
        m.extra.datasourceId === ds.datasourceId &&
        m.classId === null &&
        m.geographyId === geography
      );
    });

    if (!metric) throw new Error(`Can't find metric for ${ds.datasourceId}`);
    if (metric.length !== 1)
      throw new Error(`Returned multiple precalc metrics ${ds.datasourceId}`);

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
  const totalsByKey = (() => {
    return keyBy(totals, (total) =>
      total.classId ? total.classId : total.metricId
    );
  })();
  return metrics.map((curMetric) => {
    if (!curMetric || curMetric.value === undefined)
      throw new Error(`Malformed metrics: ${JSON.stringify(curMetric)}`);

    const idProperty = curMetric.classId ? "classId" : "metricId";

    const idValue = curMetric[idProperty];
    if (!idValue) throw new Error(`Missing total index: ${idValue}`);

    const value = curMetric[idProperty];
    if (!value)
      throw new Error(
        `Missing metric id property ${idProperty}, ${JSON.stringify(curMetric)}`
      );
    const totalMetric = totalsByKey[idValue];
    if (!totalMetric) {
      throw new Error(
        `Missing total: ${idProperty}: ${JSON.stringify(curMetric)}`
      );
    }
    if (!totalMetric.value) {
      console.log(
        `${curMetric.classId} has no value within this planing area, replacing with NA`
      );
      totalMetric.value = NaN;
    }
    return {
      ...cloneDeep(curMetric),
      value: curMetric.value / totalMetric.value,
      ...(percMetricId ? { metricId: percMetricId } : {}),
    };
  });
};
