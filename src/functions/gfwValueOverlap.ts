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

//@ts-ignore
import { geoblaze } from "geoblaze";

export async function gfwValueOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
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

        const overlapResult = await overlapRaster(mg.metricId, raster, sketch);

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
    sketch: toNullSketch(sketch, true),
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
