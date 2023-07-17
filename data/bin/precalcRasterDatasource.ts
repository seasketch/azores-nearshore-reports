import path from "path";
import fs from "fs-extra";
import {
  Histogram,
  Polygon,
  FeatureCollection,
  InternalRasterDatasource,
  ImportRasterDatasourceOptions,
  ImportRasterDatasourceConfig,
  ProjectClientBase,
  getSum,
  getHistogram,
} from "@seasketch/geoprocessing";
import {
  datasourceConfig,
  getJsonFilename,
  getCogFilename,
  isInternalVectorDatasource,
  Datasource,
} from "@seasketch/geoprocessing";
import { Stat } from "./precalc";

import projectClient from "../../project";

import { Geography } from "./precalc";
import bbox from "@turf/bbox";
// @ts-ignore
import geoblaze from "geoblaze";
import { isFeatureCollection } from "@seasketch/geoprocessing/client-core";

//
export async function precalcRasterDatasource(
  datasource: InternalRasterDatasource,
  geography: Geography
) {
  const config = genRasterConfig(projectClient, datasource, undefined);
  const tempPort = 8080;
  const url = `${projectClient.dataBucketUrl(true, tempPort)}${getCogFilename(
    config.datasourceId
  )}`;
  const raster = await geoblaze.parse(url);
  const classStatsByProperty = await genRasterKeyStats(
    raster,
    projectClient.getDatasourceById(geography.datasourceId),
    config
  );

  return classStatsByProperty;
}

/** Takes import options and creates full import config */
export function genRasterConfig<C extends ProjectClientBase>(
  projectClient: C,
  options: ImportRasterDatasourceOptions,
  newDstPath?: string
): ImportRasterDatasourceConfig {
  let {
    geo_type,
    src,
    datasourceId,
    band,
    formats = datasourceConfig.importDefaultRasterFormats,
    noDataValue,
    measurementType,
    filterDatasource,
  } = options;

  if (!band) band = 0;

  const config: ImportRasterDatasourceConfig = {
    geo_type,
    src,
    dstPath: newDstPath || datasourceConfig.defaultDstPath,
    band,
    datasourceId,
    package: projectClient.package,
    gp: projectClient.geoprocessing,
    formats,
    noDataValue,
    measurementType,
    filterDatasource,
  };

  return config;
}

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
export async function genRasterKeyStats(
  raster: any,
  geography: Datasource,
  options: ImportRasterDatasourceConfig
): Promise<Stat[]> {
  const poly = await (async () => {
    if (!geography) throw new Error(`Expected geography`);
    else if (!isInternalVectorDatasource(geography))
      throw new Error(
        `Expected ${geography.datasourceId} to be an internal vector datasource`
      );
    else {
      const jsonFilename = path.join("./data/dist", getJsonFilename(geography));
      const polys = fs.readJsonSync(jsonFilename) as FeatureCollection<Polygon>;
      return polys;
    }
  })();

  console.log(
    `Calculating keyStats, ${options.measurementType}, for raster ${options.datasourceId} and geography ${geography.datasourceId} this may take a while...`
  );

  // continous - sum
  const stats: Stat[] = [];
  if (options.measurementType === "quantitative") {
    stats.push({
      class: null,
      type: "sum",
      value: await getSum(raster, poly),
    });
  }

  // categorical - histogram, count by class
  if (options.measurementType === "categorical") {
    const histogram = (await getHistogram(raster)) as Histogram;
    if (!histogram) throw new Error("Histogram not returned");

    Object.keys(histogram).forEach((curClass) => {
      stats.push({
        class: curClass,
        type: "count",
        value: histogram[curClass],
      });
    });
  }

  return stats;
}
