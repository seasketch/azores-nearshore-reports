import {
  Sketch,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  NullSketchCollection,
  NullSketch,
  getSketchFeatures,
  getFlatGeobufFilename,
  clipMultiMerge,
} from "@seasketch/geoprocessing";
import project from "../../project";
import {
  overlapArea,
  overlapAreaGroupMetrics,
} from "@seasketch/geoprocessing/src";
import {
  firstMatchingMetric,
  getUserAttribute,
} from "@seasketch/geoprocessing/client-core";
import { getPrecalcMetrics } from "../../data/bin/getPrecalcMetrics";
import { clipSketchToSubregion } from "../util/clipSketchToSubregion";

interface ExtraParams {
  /** Optional ID(s) of geographies to operate on. **/
  geographies?: string[];
}

const metricGroup = project.getMetricGroup("boundaryAreaOverlap");
const boundaryTotalMetrics = getPrecalcMetrics(
  metricGroup,
  "area",
  "nearshore"
);
const totalAreaMetric = firstMatchingMetric(
  boundaryTotalMetrics,
  (m) => m.groupId === null
);

export async function boundaryAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams?: ExtraParams
): Promise<ReportResult> {
  sketch = await clipSketchToSubregion(sketch, extraParams!);

  const areaMetrics = (
    await overlapArea(metricGroup.metricId, sketch, totalAreaMetric.value, {
      includePercMetric: false,
    })
  ).map(
    (metrics): Metric => ({
      ...metrics,
      classId: metricGroup.classes[0].classId,
    })
  );

  // Generate area metrics grouped by protection level, with area overlap within protection level removed
  // Each sketch gets one group metric for its protection level, while collection generates one for each protection level
  const sketchToMpaClass = getSketchToMpaProtectionLevel(sketch, areaMetrics);
  const metricToLevel = (sketchMetric: Metric) => {
    return sketchToMpaClass[sketchMetric.sketchId!];
  };

  const levelMetrics = await overlapAreaGroupMetrics({
    metricId: metricGroup.metricId,
    groupIds: ["FULLY_PROTECTED", "HIGHLY_PROTECTED"],
    sketch,
    metricToGroup: metricToLevel,
    metrics: areaMetrics,
    classId: metricGroup.classes[0].classId,
    outerArea: totalAreaMetric.value,
  });

  return {
    metrics: sortMetrics(rekeyMetrics([...areaMetrics, ...levelMetrics])),
    sketch: toNullSketch(sketch),
  };
}

export function getSketchToMpaProtectionLevel(
  sketch: Sketch | SketchCollection | NullSketchCollection | NullSketch,
  metrics: Metric[]
): Record<string, string> {
  const sketchFeatures = getSketchFeatures(sketch);
  const protectionLevels = sketchFeatures.reduce<Record<string, string>>(
    (levels, sketch) => {
      const designation = getUserAttribute(
        sketch.properties,
        "designation",
        ""
      );
      levels[sketch.properties.id] = designation;
      return levels;
    },
    {}
  );
  return protectionLevels;
}

export default new GeoprocessingHandler(boundaryAreaOverlap, {
  title: "boundaryAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 40,
  requiresProperties: [],
  memory: 10240,
});
