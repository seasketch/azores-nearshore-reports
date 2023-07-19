import path from "path";
import fs from "fs-extra";
import area from "@turf/area";

import {
  ClassStats,
  FeatureCollection,
  ImportVectorDatasourceConfig,
  ImportVectorDatasourceOptions,
  InternalVectorDatasource,
  Polygon,
} from "@seasketch/geoprocessing/client-core";
import { Geography, Stat } from "./precalc";
import projectClient from "../../project";
import {
  Feature,
  MultiPolygon,
  ProjectClientBase,
  clipMultiMerge,
  datasourceConfig,
} from "@seasketch/geoprocessing";

export async function precalcVectorDatasource(
  datasource: InternalVectorDatasource,
  geography: Geography
) {
  const config = genVectorConfig(projectClient, datasource);

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

  // Creates record of all class keys present in OG features
  // to avoid missing a class after cropping
  let featureCollClasses: Record<string, string[]> = {};
  config.classKeys.forEach((classProperty) => {
    featureColl.features.forEach((feat) => {
      if (!feat.properties) throw new Error("Missing properties");
      if (!featureCollClasses[classProperty]) {
        featureCollClasses[classProperty] = [];
      }
      if (
        !featureCollClasses[classProperty].includes(
          feat.properties[classProperty]
        )
      ) {
        featureCollClasses[classProperty].push(feat.properties[classProperty]);
      }
    });
  });

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
      {
        class: "total",
        type: "count",
        value: clippedFeatureColl.features.length,
      },
      { class: "total", type: "area", value: area(clippedFeatureColl) },
    ];

  const totalStats = clippedFeatureColl.features.reduce<Stat[]>(
    (statsSoFar, feat) => {
      const featArea = area(feat);
      return [
        { class: "total", type: "count", value: statsSoFar[0].value! + 1 },
        {
          class: "total",
          type: "area",
          value: statsSoFar[1].value! + featArea,
        },
      ];
    },
    [
      { class: "total", type: "count", value: 0 },
      { class: "total", type: "area", value: 0 },
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

    // Creates metrics for features classes lost during clipping
    featureCollClasses[classProperty].forEach((curClass) => {
      if (!Object.keys(metrics).includes(curClass)) {
        totalStats.push({
          class: curClass,
          type: "count",
          value: 0,
        });
        totalStats.push({
          class: curClass,
          type: "area",
          value: 0,
        });
      }
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
