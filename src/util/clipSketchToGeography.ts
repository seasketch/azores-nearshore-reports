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
import {
  clipMultiMerge,
  getFlatGeobufFilename,
} from "@seasketch/geoprocessing";
import simplify from "@turf/simplify";

/**
 * Clips sketch to geography. If geographyId and simplifyOptions are both null, returns original sketch
 * @param sketch Sketch or SketchCollection
 * @param geographyId optional geographyId to clip sketch to
 * @param simplifyOptions optional simplifyOptions { tolerance: number; highQuality: boolean } to simplify geometries
 * @returns Sketch | SketchCollection
 */
export async function clipSketchToGeography(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>,
  geographyId?: string,
  simplifyOptions?: { tolerance: number; highQuality: boolean }
): Promise<Sketch<Polygon> | SketchCollection<Polygon>> {
  if (!geographyId) {
    if (simplifyOptions) return simplify(sketch, simplifyOptions);
    else return sketch;
  }

  const geography = project.getGeographyById(geographyId);
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
        ? simplifyOptions
          ? (sketch.geometry = simplify(
              intersection.geometry as Polygon,
              simplifyOptions
            ))
          : (sketch.geometry = intersection.geometry as Polygon)
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
