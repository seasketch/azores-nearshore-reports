import path from "path";
import fs from "fs-extra";
import {
  Histogram,
  Polygon,
  FeatureCollection,
  InternalRasterDatasource,
  ImportRasterDatasourceOptions,
  ImportRasterDatasourceConfig,
  Datasource,
  MultiPolygon,
} from "@seasketch/geoprocessing/client-core";
import {
  datasourceConfig,
  getJsonFilename,
  getCogFilename,
  isInternalVectorDatasource,
  ProjectClientBase,
  getSum,
  getHistogram,
  bboxOverlap,
  BBox,
} from "@seasketch/geoprocessing";
import { Stat, Geography } from "./precalc";

import projectClient from "../../project";

import bbox from "@turf/bbox";
// @ts-ignore
import geoblaze from "geoblaze";

/**
 *
 * @param datasource InternalRasterDatasource from datasources.json
 * @param geography Geography from geographies.json
 * @returns Stat array
 */
export async function precalcRasterDatasource(
  datasource: InternalRasterDatasource,
  geography: Geography
): Promise<Stat[]> {
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
      const polys = fs.readJsonSync(jsonFilename) as FeatureCollection<
        Polygon | MultiPolygon
      >;
      return polys;
    }
  })();

  console.log(
    `Calculating keyStats, ${options.measurementType}, for raster ${options.datasourceId} and geography ${geography.datasourceId} this may take a while...`
  );

  const rasterBbox: BBox = [raster.xmin, raster.ymin, raster.xmax, raster.ymax];

  const stats: Stat[] = [];
  // No overlap
  if (!bboxOverlap(bbox(poly), rasterBbox)) {
    console.log("No overlap -- returning 0 sum");

    stats.push({
      class: "total",
      type: "sum",
      value: 0,
    });
  }

  // continous - sum
  else if (options.measurementType === "quantitative") {
    stats.push({
      class: "total",
      type: "sum",
      value: await getSum(raster, poly),
    });
  }

  // categorical - histogram, count by class
  else if (options.measurementType === "categorical") {
    const histogram = (await getHistogram(raster)) as Histogram;
    if (!histogram) throw new Error("Histogram not returned");

    Object.keys(histogram).forEach((curClass) => {
      stats.push({
        class: curClass,
        type: "count",
        value: histogram[curClass],
      });
    });
  } else
    console.log(
      `Something is malformed, check raster ${options.datasourceId} and geography ${geography.datasourceId}]`
    );

  return stats;
}
