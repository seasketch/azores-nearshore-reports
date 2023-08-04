import {
  Sketch,
  SketchCollection,
  Feature,
  GeoprocessingHandler,
  Polygon,
  toSketchArray,
  getCogFilename,
} from "@seasketch/geoprocessing";
import { loadCogWindow } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import { min, max, mean } from "simple-statistics";
import { BathymetryResults } from "../util/BathymetryResults";
import project from "../../project";

// @ts-ignore
import geoblaze, { Georaster } from "geoblaze";

export async function bathymetry(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<BathymetryResults> {
  const mg = project.getMetricGroup("bathymetry");
  const sketches = toSketchArray(sketch);
  const box = sketch.bbox || bbox(sketch);
  if (!mg.classes[0].datasourceId)
    throw new Error(`Expected datasourceId for ${mg.classes[0]}`);
  const url = `${project.dataBucketUrl()}${getCogFilename(
    mg.classes[0].datasourceId
  )}`;
  const raster = await loadCogWindow(url, {
    windowBox: box,
  });
  return await bathyStats(sketches, raster);
}

/**
 * Core raster analysis - given raster, counts number of cells with value that are within Feature polygons
 */
export async function bathyStats(
  /** Polygons to filter for */
  features: Feature<Polygon>[],
  /** bathymetry raster to search */
  raster: Georaster
): Promise<BathymetryResults> {
  const sketchStats = features.map((feature, index) => {
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
        // Temp workaround
        const firstCoordValue = geoblaze.identify(
          raster,
          feature.geometry.coordinates[0][0]
        )[0];
        return {
          min: firstCoordValue,
          mean: firstCoordValue,
          max: firstCoordValue,
        };
      } else {
        throw err;
      }
    }
  });
  return {
    min: min(sketchStats.map((s) => s.min)),
    max: max(sketchStats.map((s) => s.max)),
    mean: mean(sketchStats.map((s) => s.mean)),
    units: "meters",
  };
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