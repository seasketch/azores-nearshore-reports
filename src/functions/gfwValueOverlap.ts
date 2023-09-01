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
} from "@seasketch/geoprocessing";
import { loadCog, loadCogWindow } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";
import { ExtraParams } from "../types";
import { getParamStringArray } from "../util/extraParams";
import { clipSketchToGeography } from "../util/clipSketchToGeography";

export async function gfwValueOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams?: ExtraParams
): Promise<ReportResult> {
  const geographyId = extraParams
    ? getParamStringArray("geographyIds", extraParams)[0]
    : undefined;
  const clippedSketch = await clipSketchToGeography(sketch, geographyId);
  const box = clippedSketch.bbox || bbox(clippedSketch);
  const mg = project.getMetricGroup("gfwValueOverlap");

  const metrics: Metric[] = (
    await Promise.all(
      mg.classes.map(async (curClass) => {
        // start raster load and move on in loop while awaiting finish
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass}`);
        const url = `${project.dataBucketUrl()}${getCogFilename(
          curClass.datasourceId
        )}`;
        const raster = await loadCogWindow(url, { windowBox: box });

        const overlapResult = await overlapRaster(
          mg.metricId,
          raster,
          clippedSketch
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
    sketch: toNullSketch(clippedSketch, true),
  };
}

export default new GeoprocessingHandler(gfwValueOverlap, {
  title: "gfwValueOverlap",
  description: "gfw fishing effort metrics",
  timeout: 120, // seconds
  executionMode: "async",
  requiresProperties: [],
  memory: 8192,
});
