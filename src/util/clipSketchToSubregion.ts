import {
  InternalVectorDatasource,
  Polygon,
  Sketch,
  SketchCollection,
  Feature,
  MultiPolygon,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import { featureCollection } from "@turf/helpers";
import bbox from "@turf/bbox";
import project from "../../project";
import geographies from "../../project/geographies.json";
import {
  clipMultiMerge,
  getFlatGeobufFilename,
} from "@seasketch/geoprocessing";
import simplify from "@turf/simplify";

export interface ExtraParams {
  /** Optional ID(s) of geographies to operate on. **/
  geographies?: string[];
}

/**
 * Returns one aggregate object for every groupId present in metrics
 * Each object includes following properties:
 * numSketches - count of child sketches in the group
 * [classId] - a percValue for each classId present in metrics for group
 * value - sum of value across all classIds present in metrics for group
 * percValue - given sum value across all classIds, contains ratio of total sum across all class IDs
 */
export async function clipSketchToSubregion(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: ExtraParams
): Promise<Sketch<Polygon> | SketchCollection<Polygon>> {
  if (extraParams && extraParams.geographies && extraParams.geographies[0]) {
    const geography = geographies.find(
      (g) =>
        extraParams.geographies &&
        extraParams.geographies[0] &&
        g.geographyId === extraParams.geographies[0]
    );
    if (!geography) throw new Error("Specified geography doesn't exist");

    const box = sketch.bbox || bbox(sketch);
    const ds = project.getDatasourceById(
      geography.datasourceId
    ) as InternalVectorDatasource;
    const subregion = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
      project.dataBucketUrl() + getFlatGeobufFilename(ds),
      box
    );

    if (!subregion[0]) {
      console.log(
        "Sketch/SketchCollection",
        sketch.properties.name,
        "has no overlap with geography",
        geography.geographyId
      );

      const sketches = toSketchArray(sketch);
      const finalsketches: Sketch<Polygon>[] = [];
      sketches.forEach((sketch) => {
        sketch.geometry = {
          type: "Polygon",
          coordinates: [[[0.0, 0.0]], [[0.0, 0.0]], [[0.0, 0.0]]],
        };
        finalsketches.push(sketch);
      });

      //Sketch
      if (finalsketches.length === 1) {
        return finalsketches[0];
      }
      //Sketch Collection
      else {
        return {
          properties: sketch.properties,
          bbox: box,
          type: "FeatureCollection",
          features: finalsketches,
        };
      }
    } else {
      const sketches = toSketchArray(sketch);
      const finalsketches: Sketch<Polygon>[] = [];
      sketches.forEach((sketch) => {
        //const intersection = intersect(sketch.geometry, subregion[0].geometry);
        const intersection = clipMultiMerge(
          sketch,
          featureCollection(subregion),
          "intersection"
        );
        if (!intersection) console.log("no intersection");
        intersection
          ? (sketch.geometry = intersection.geometry as Polygon)
          : (sketch.geometry = {
              type: "Polygon",
              coordinates: [[[0.0, 0.0]], [[0.0, 0.0]], [[0.0, 0.0]]],
            });
        finalsketches.push(sketch);
      });

      //Sketch
      if (finalsketches.length === 1) {
        return finalsketches[0];
      }
      //Sketch Collection
      else {
        return {
          properties: sketch.properties,
          bbox: box,
          type: "FeatureCollection",
          features: finalsketches,
        };
      }
    }
  }

  return sketch;
}

/**
 * Returns one aggregate object for every groupId present in metrics
 * Each object includes following properties:
 * numSketches - count of child sketches in the group
 * [classId] - a percValue for each classId present in metrics for group
 * value - sum of value across all classIds present in metrics for group
 * percValue - given sum value across all classIds, contains ratio of total sum across all class IDs
 */
export async function clipSketchToSubregionSimple(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  extraParams: ExtraParams,
  options: { tolerance: number; highQuality: boolean }
): Promise<Sketch<Polygon> | SketchCollection<Polygon>> {
  if (extraParams && extraParams.geographies && extraParams.geographies[0]) {
    const geography = geographies.find(
      (g) =>
        extraParams.geographies &&
        extraParams.geographies[0] &&
        g.geographyId === extraParams.geographies[0]
    );
    if (!geography) throw new Error("Specified geography doesn't exist");

    const box = sketch.bbox || bbox(sketch);
    const ds = project.getDatasourceById(
      geography.datasourceId
    ) as InternalVectorDatasource;
    const subregion = await fgbFetchAll<Feature<Polygon | MultiPolygon>>(
      project.dataBucketUrl() + getFlatGeobufFilename(ds),
      box
    );

    if (!subregion[0]) {
      console.log(
        "Sketch/SketchCollection",
        sketch.properties.name,
        "has no overlap with geography",
        geography.geographyId
      );

      const sketches = toSketchArray(sketch);
      const finalsketches: Sketch<Polygon>[] = [];
      sketches.forEach((sketch) => {
        sketch.geometry = {
          type: "Polygon",
          coordinates: [[[0.0, 0.0]], [[0.0, 0.0]], [[0.0, 0.0]]],
        };
        finalsketches.push(sketch);
      });

      //Sketch
      if (finalsketches.length === 1) {
        return finalsketches[0];
      }
      //Sketch Collection
      else {
        return {
          properties: sketch.properties,
          bbox: box,
          type: "FeatureCollection",
          features: finalsketches,
        };
      }
    } else {
      const sketches = toSketchArray(sketch);
      const finalsketches: Sketch<Polygon>[] = [];
      sketches.forEach((sketch) => {
        const intersection = clipMultiMerge(
          sketch,
          featureCollection(subregion),
          "intersection"
        );
        if (!intersection) console.log("no intersection");
        intersection
          ? (sketch.geometry = simplify(
              intersection.geometry as Polygon,
              options
            ))
          : (sketch.geometry = {
              type: "Polygon",
              coordinates: [[[0.0, 0.0]], [[0.0, 0.0]], [[0.0, 0.0]]],
            });
        finalsketches.push(sketch);
      });

      //Sketch
      if (finalsketches.length === 1) {
        return finalsketches[0];
      }
      //Sketch Collection
      else {
        return {
          properties: sketch.properties,
          bbox: box,
          type: "FeatureCollection",
          features: finalsketches,
        };
      }
    }
  }

  return simplify(sketch, options);
}
