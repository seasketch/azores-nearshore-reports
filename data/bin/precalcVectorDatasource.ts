import path from "path";
// import { FeatureCollection, Polygon } from "../../../src/types";
import fs from "fs-extra";
import { $ } from "zx";
//   ClassStats,
//   KeyStats,
//   InternalVectorDatasource,
//   ImportVectorDatasourceOptions,
//   Stats,

// import {
//   datasourceConfig,
//   getDatasetBucketName,
// } from "../../../src/datasources";
// import { ProjectClientBase } from "../../../src";
// import { createOrUpdateDatasource } from "./datasources";
import area from "@turf/area";
import intersect from "@turf/intersect";

// import { publishDatasource } from "./publishDatasource";
import {
  ClassStats,
  Datasource,
  FeatureCollection,
  ImportVectorDatasourceConfig,
  ImportVectorDatasourceOptions,
  InternalVectorDatasource,
  KeyStats,
  Polygon,
  createMetrics,
  toSketchArray,
} from "@seasketch/geoprocessing/client-core";
import { Geography, Stat } from "./precalc";
import projectClient from "../../project";
import {
  Feature,
  MultiPolygon,
  ProjectClientBase,
  Properties,
  clip,
  clipMultiMerge,
  createMetric,
  datasourceConfig,
  genFeatureCollection,
  objectiveAnswerMapSchema,
  overlapFeatures,
  statsSchema,
} from "@seasketch/geoprocessing";
import flatten from "@turf/flatten";

export async function precalcVectorDatasource(
  datasource: InternalVectorDatasource,
  geography: Geography
) {
  const config = await genVectorConfig(projectClient, datasource);

  console.log(
    `Calculating keyStats for vector ${datasource.datasourceId} and geography ${geography.datasourceId} this may take a while...`
  );

  const classStatsByProperty = genVectorKeyStats(
    config,
    projectClient.getDatasourceById(
      geography.datasourceId
    ) as InternalVectorDatasource
  );

  return classStatsByProperty;
}
/** Takes import options and creates full import config */
export function genVectorConfig<C extends ProjectClientBase>(
  projectClient: C,
  options: ImportVectorDatasourceOptions,
  newDstPath?: string
): ImportVectorDatasourceConfig {
  let {
    geo_type,
    src,
    datasourceId,
    propertiesToKeep = [],
    classKeys,
    layerName,
    formats = datasourceConfig.importDefaultVectorFormats,
    explodeMulti,
  } = options;
  if (!layerName)
    layerName = path.basename(src, "." + path.basename(src).split(".").pop());
  // merge to ensure keep at least classKeys
  propertiesToKeep = Array.from(new Set(propertiesToKeep.concat(classKeys)));
  const config: ImportVectorDatasourceConfig = {
    geo_type,
    src,
    dstPath: newDstPath || datasourceConfig.defaultDstPath,
    propertiesToKeep,
    classKeys,
    layerName,
    datasourceId,
    package: projectClient.package,
    gp: projectClient.geoprocessing,
    formats,
    explodeMulti,
  };
  return config;
}

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
export function genVectorKeyStats(
  config: ImportVectorDatasourceConfig,
  geography: InternalVectorDatasource
): Stat[] {
  const rawJsonDs = fs.readJsonSync(
    getJsonPath(config.dstPath, config.datasourceId)
  );
  const featureColl = rawJsonDs as FeatureCollection<Polygon | MultiPolygon>;

  const rawJsonGeo = fs.readJsonSync(
    getJsonPath(config.dstPath, geography.datasourceId)
  );

  const geo = rawJsonGeo as FeatureCollection<Polygon | MultiPolygon>;

  const clippedFeatures = featureColl.features
    .map(
      (feat) =>
        clipMultiMerge(feat, geo, "intersection", {
          properties: feat.properties,
        }) as Feature<Polygon | MultiPolygon>
    )
    .filter((e) => e);

  const clippedFeatureColl = {
    ...featureColl,
    features: clippedFeatures,
  };

  if (!config.classKeys || config.classKeys.length === 0)
    return [
      { class: null, type: "count", value: clippedFeatureColl.features.length },
      { class: null, type: "area", value: area(clippedFeatureColl) },
    ];

  const totalStats = clippedFeatureColl.features.reduce<Stat[]>(
    (statsSoFar, feat) => {
      const featArea = area(feat);
      return [
        { class: null, type: "count", value: statsSoFar[0].value! + 1 },
        { class: null, type: "area", value: statsSoFar[1].value! + featArea },
      ];
    },
    [
      { class: null, type: "count", value: 0 },
      { class: null, type: "area", value: 0 },
    ]
  );

  config.classKeys.forEach((classProperty) => {
    const metrics = clippedFeatureColl.features.reduce<ClassStats>(
      (classesSoFar, feat) => {
        if (!feat.properties) throw new Error("Missing properties");
        if (!config.classKeys) throw new Error("Missing classProperty");
        const curClass = feat.properties[classProperty];
        const curCount = classesSoFar[curClass]?.count || 0;
        const curArea = classesSoFar[curClass]?.area || 0;
        const featArea = area(feat);
        return {
          ...classesSoFar,
          [curClass]: {
            count: curCount + 1,
            area: curArea + featArea,
          },
        };
      },
      {}
    );

    Object.keys(metrics).forEach((curClass: string) => {
      totalStats.push({
        class: curClass,
        type: "count",
        value: metrics[curClass].count as number,
      });
      totalStats.push({
        class: curClass,
        type: "area",
        value: metrics[curClass].area as number,
      });
    });
  });

  console.log("key stats", JSON.stringify(totalStats));

  return totalStats;
}

function getJsonPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".json";
}

function getFlatGeobufPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".fgb";
}
