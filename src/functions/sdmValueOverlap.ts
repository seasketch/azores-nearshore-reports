import {
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  Sketch,
  SketchCollection,
  DefaultExtraParams,
  toNullSketch,
  rekeyMetrics,
  sortMetrics,
  getCogFilename,
  MultiPolygon,
  getFirstFromParam,
  rasterMetrics,
} from "@seasketch/geoprocessing";
import { loadCog } from "@seasketch/geoprocessing/dataproviders";
import project from "../../project";
import { clipToGeography } from "../util/clipToGeography";

const metricGroup = project.getMetricGroup("sdmValueOverlap");

export async function sdmValueOverlap(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {}
): Promise<ReportResult> {
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  const finalSketch = await clipToGeography(sketch, curGeography);
  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (!curClass.datasourceId)
          throw new Error(`Expected datasourceId for ${curClass}`);
        const url = `${project.dataBucketUrl()}${getCogFilename(
          project.getInternalRasterDatasourceById(curClass.datasourceId)
        )}`;
        const raster = await loadCog(url);

        const overlapResult = await rasterMetrics(raster, {
          metricId: metricGroup.metricId,
          feature: finalSketch,
        });
        return overlapResult.map(
          (metrics): Metric => ({
            ...metrics,
            classId: curClass.classId,
            geographyId: curGeography.geographyId,
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
