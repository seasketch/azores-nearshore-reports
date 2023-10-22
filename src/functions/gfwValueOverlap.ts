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
  getFirstFromParam,
} from "@seasketch/geoprocessing";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import project from "../../project";
import { DefaultExtraParams } from "../types";
import { clipToGeography } from "../util/clipToGeography";

export async function gfwValueOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: DefaultExtraParams
): Promise<ReportResult> {
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  const clippedSketch = await clipToGeography(sketch, curGeography);
  const mg = project.getMetricGroup("gfwValueOverlap");

  const metrics: Metric[] = (
    await Promise.all(
      mg.classes.map(async (curClass) => {
        // start raster load and move on in loop while awaiting finish
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass}`);
        const url = `${project.dataBucketUrl()}${getCogFilename(
          project.getInternalRasterDatasourceById(curClass.datasourceId)
        )}`;
        const raster = await loadCog(url);

        const overlapResult = await overlapRaster(
          mg.metricId,
          raster,
          clippedSketch
        );

        return overlapResult.map(
          (metrics): Metric => ({
            ...metrics,
            classId: curClass.classId,
            geographyId,
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
