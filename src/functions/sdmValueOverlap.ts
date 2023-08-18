import {
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  Sketch,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  overlapRaster,
  getCogFilename,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { loadCogWindow } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";
import { clipSketchToGeography } from "../util/clipSketchToGeography";
import { ExtraParams } from "../types";
import { getParamStringArray } from "../util/extraParams";

const metricGroup = project.getMetricGroup("sdmValueOverlap");

export async function sdmValueOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams?: ExtraParams
): Promise<ReportResult> {
  const geographyId = extraParams
    ? getParamStringArray("geographies", extraParams)[0]
    : undefined;
  const finalSketch = await clipSketchToGeography(sketch, geographyId);
  const box = finalSketch.bbox || bbox(finalSketch);
  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        // start raster load and move on in loop while awaiting finish
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass}`);
        const url = `${project.dataBucketUrl()}${getCogFilename(
          curClass.datasourceId
        )}`;
        const raster = await loadCogWindow(url, {});
        // start analysis as soon as source load done
        const overlapResult = await overlapRaster(
          metricGroup.metricId,
          raster,
          finalSketch
        );
        return overlapResult.map(
          (metrics): Metric => ({
            ...metrics,
            classId: curClass.classId,
          })
        );
      })
    )
  ).reduce(
    // merge
    (metricsSoFar, curClassMetrics) => [...metricsSoFar, ...curClassMetrics],
    []
  );

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(finalSketch, true),
  };
}

export default new GeoprocessingHandler(sdmValueOverlap, {
  title: "sdmValueOverlap",
  description: "metrics for sketch overlap with SDM",
  timeout: 900, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 10240,
});
