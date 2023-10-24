import {
  Sketch,
  SketchCollection,
  Feature,
  GeoprocessingHandler,
  DefaultExtraParams,
  Polygon,
  toSketchArray,
  getCogFilename,
  MultiPolygon,
  getFirstFromParam,
} from "@seasketch/geoprocessing";
import { loadCogWindow } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import { min, max, mean } from "simple-statistics";
import project from "../../project";

// @ts-ignore
import geoblaze, { Georaster } from "geoblaze";
import { clipToGeography } from "../util/clipToGeography";
import { BathymetryResults } from "../types";

export async function bathymetry(
  sketch:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>,
  extraParams: DefaultExtraParams = {}
): Promise<BathymetryResults> {
  const geographyId = getFirstFromParam("geographyIds", extraParams);
  const curGeography = project.getGeographyById(geographyId, {
    fallbackGroup: "default-boundary",
  });

  const clippedSketch = await clipToGeography(sketch, curGeography);
  const mg = project.getMetricGroup("bathymetry");
  const sketches = toSketchArray(clippedSketch);
  const box = clippedSketch.bbox || bbox(clippedSketch);
  if (!mg.classes[0].datasourceId)
    throw new Error(`Expected datasourceId for ${mg.classes[0]}`);
  const url = `${project.dataBucketUrl()}${getCogFilename(
    project.getInternalRasterDatasourceById(mg.classes[0].datasourceId)
  )}`;
  const raster = await loadCogWindow(url, {
    windowBox: box,
  });
  const stats = await bathyStats(sketches, raster);
  if (!stats)
    throw new Error(
      `No stats returned for ${sketch.properties.name} with ${curGeography.geographyId} geography`
    );
  return stats;
}

/**
 * Core raster analysis - given raster, counts number of cells with value that are within Feature polygons
 */
export async function bathyStats(
  /** Polygons to filter for */
  features: Feature<Polygon | MultiPolygon>[],
  /** bathymetry raster to search */
  raster: Georaster
): Promise<BathymetryResults> {
  const sketchStats = features.map((feature, index) => {
    // If empty sketch (from subregional clipping)
    if (!feature.geometry.coordinates.length)
      return {
        min: null,
        mean: null,
        max: null,
      };
    try {
      // @ts-ignore
      const stats = geoblaze.stats(raster, feature, {
        calcMax: true,
        calcMean: true,
        calcMin: true,
      })[0];
      return { min: stats.min, max: stats.max, mean: stats.mean };
    } catch (err) {
      if (err === "No Values were found in the given geometry") {
        return {
          min: null,
          mean: null,
          max: null,
        };
      } else {
        throw err;
      }
    }
  });

  if (!sketchStats.map((s) => s.min).filter(notNull).length) {
    // No sketch overlaps with planning area
    return { min: 0, max: 0, mean: 0, units: "meters" };
  }

  const minVal = min(sketchStats.map((s) => s.min).filter(notNull));
  const maxVal = max(sketchStats.map((s) => s.max).filter(notNull));
  const meanVal = mean(sketchStats.map((s) => s.mean).filter(notNull));

  // Restrict values to be <= 0
  return {
    min: minVal > 0 ? 0 : minVal,
    max: maxVal > 0 ? 0 : maxVal,
    mean: meanVal > 0 ? 0 : meanVal,
    units: "meters",
  };
}

function notNull(value: number): value is number {
  return value !== null && value !== undefined;
}

export default new GeoprocessingHandler(bathymetry, {
  title: "bathymetry",
  description: "calculates bathymetry within given sketch",
  timeout: 60, // seconds
  executionMode: "async",
  // Specify any Sketch Class form attributes that are required
  requiresProperties: [],
  memory: 8192,
});
