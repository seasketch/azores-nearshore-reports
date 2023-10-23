import {
  Sketch,
  GeoprocessingHandler,
  Polygon,
  MultiPolygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
  getFirstFromParam,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import {
  OusFeature,
  overlapOusDemographic,
} from "../util/overlapOusDemographic";
import { featureCollection } from "@turf/helpers";
import project from "../../project";
import { clipToGeography } from "../util/clipToGeography";
import { DefaultExtraParams } from "../types";

const METRIC = project.getMetricGroup("ousSectorDemographicOverlap");

/** Calculate sketch area overlap inside and outside of multiple planning area boundaries */
export async function ousDemographicOverlap(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams?: DefaultExtraParams
): Promise<ReportResult> {
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });
  const clippedSketch = await clipToGeography(sketch, curGeography, {
    tolerance: 0.0001,
    highQuality: true,
  });
  const url = `${project.dataBucketUrl()}ous_demographics.fgb`;

  // Fetch the whole nearshore boundary, because we need to calculate its total area
  const shapes = await fgbFetchAll<OusFeature>(url, project.basic.bbox);

  const metrics = (
    await overlapOusDemographic(featureCollection(shapes), clippedSketch)
  ).metrics.map((metric) => ({
    ...metric,
    geographyId: curGeography.geographyId,
  }));

  return {
    metrics: rekeyMetrics(metrics),
    sketch: toNullSketch(clippedSketch, true),
  };
}

export default new GeoprocessingHandler(ousDemographicOverlap, {
  title: "ousDemographicOverlap",
  description: "Calculates ous overlap metrics",
  timeout: 900, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  memory: 10240,
  requiresProperties: [],
});
