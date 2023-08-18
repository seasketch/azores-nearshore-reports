import {
  Sketch,
  GeoprocessingHandler,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  rekeyMetrics,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import {
  OusFeature,
  overlapOusDemographic,
} from "../util/overlapOusDemographic";
import { featureCollection } from "@turf/helpers";
import project from "../../project";
import { clipSketchToGeography } from "../util/clipSketchToGeography";
import { ExtraParams } from "../types";
import { getParamStringArray } from "../util/extraParams";

const METRIC = project.getMetricGroup("ousSectorDemographicOverlap");

/** Calculate sketch area overlap inside and outside of multiple planning area boundaries */
export async function ousDemographicOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams?: ExtraParams
): Promise<ReportResult> {
  const geographyId = extraParams
    ? getParamStringArray("geographies", extraParams)[0]
    : undefined;
  const clippedSketch = await clipSketchToGeography(sketch, geographyId, {
    tolerance: 0.00005,
    highQuality: true,
  });
  const url = `${project.dataBucketUrl()}ous_demographics.fgb`;

  // Fetch the whole nearshore boundary, because we need to calculate its total area
  const shapes = await fgbFetchAll<OusFeature>(url, project.basic.bbox);

  const metrics = (
    await overlapOusDemographic(featureCollection(shapes), clippedSketch)
  ).metrics;

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
