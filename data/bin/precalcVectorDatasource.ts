import path from "path";
import fs from "fs-extra";
import area from "@turf/area";
import {
  FeatureCollection,
  ImportVectorDatasourceConfig,
  ImportVectorDatasourceOptions,
  InternalVectorDatasource,
  Metric,
  Polygon,
} from "@seasketch/geoprocessing";
import projectClient from "../../project";
import {
  Feature,
  MultiPolygon,
  ProjectClientBase,
  clipMultiMerge,
  datasourceConfig,
  createMetric,
} from "@seasketch/geoprocessing";
import { Geography } from "../../src/util/types";

/**
 * Creates precalc metrics for a datasource and geography
 * @param datasource InternalVectorDatasource that's been imported
 * @param geography Geography to be calculated for
 * @returns Metric[] to be added to precalc.json
 */
export async function precalcVectorDatasource(
  datasource: InternalVectorDatasource,
  geography: Geography
): Promise<Metric[]> {
  // Creates vector config from datasources.json
  const vectorConfig = genVectorConfig(projectClient, datasource);

  console.log(
    `Precalculating vector ${datasource.datasourceId} and geography ${geography.datasourceId}`
  );

  // Create metrics and return to precalc.ts
  return genVectorMetrics(vectorConfig, geography);
}

/** Takes import options and creates full import config
 *  This had to be copied over from gp library due to the export not
 *  being propagated out. It's identical to genVectorConfig in gp library
 */
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

/**
 * Returns Metric array for vector datasource and geography
 * @param vectorConfig ImportVectorDatasourceConfig datasource to calculate metrics for
 * @param geography Geography to calculate metrics for
 * @returns Metric[]
 */
export function genVectorMetrics(
  vectorConfig: ImportVectorDatasourceConfig,
  geography: Geography
): Metric[] {
  // Read in vector datasource as FeatureCollection
  const rawJsonDs = fs.readJsonSync(
    getJsonPath(vectorConfig.dstPath, vectorConfig.datasourceId)
  );
  const featureCollection = rawJsonDs as FeatureCollection<
    Polygon | MultiPolygon
  >;

  // Creates record of all class keys present in OG features
  // to avoid missing a class after cropping
  let featureCollClasses: Record<string, string[]> = {};
  vectorConfig.classKeys.forEach((classProperty) => {
    featureCollection.features.forEach((feat) => {
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

  // Read in vector geography datasource as FeatureCollection
  const rawJsonGeo = fs.readJsonSync(
    getJsonPath(vectorConfig.dstPath, geography.datasourceId)
  );
  const geographyFeatureColl = rawJsonGeo as FeatureCollection<
    Polygon | MultiPolygon
  >;

  // Clip vector data to geography boundaries
  const clippedFeatures = featureCollection.features
    .map(
      (feat) =>
        clipMultiMerge(feat, geographyFeatureColl, "intersection", {
          properties: feat.properties,
        }) as Feature<Polygon | MultiPolygon>
    )
    .filter((e) => e);

  // Keeps metadata imtact but overwrites geometry with clipped features
  const clippedFeatureColl = {
    ...featureCollection,
    features: clippedFeatures,
  };

  // If a simple vector datasource with no classes, return total metrics
  if (!vectorConfig.classKeys || vectorConfig.classKeys.length === 0)
    return [
      createMetric({
        geographyId: geography.geographyId,
        classId: vectorConfig.datasourceId + "-total",
        metricId: "count",
        value: clippedFeatureColl.features.length,
      }),
      createMetric({
        geographyId: geography.geographyId,
        classId: vectorConfig.datasourceId + "-total",
        metricId: "area",
        value: area(clippedFeatureColl),
      }),
    ];

  const totals = clippedFeatureColl.features.reduce(
    (stats, feat) => {
      const featArea = area(feat);
      return { ...stats, count: stats.count + 1, area: stats.area + featArea };
    },
    { count: 0, area: 0 }
  );

  // Create total metrics
  const totalMetrics: Metric[] = [
    createMetric({
      geographyId: geography.geographyId,
      classId: vectorConfig.datasourceId + "-total",
      metricId: "count",
      value: totals.count,
    }),
    createMetric({
      geographyId: geography.geographyId,
      classId: vectorConfig.datasourceId + "-total",
      metricId: "area",
      value: totals.area,
    }),
  ];

  // Create class metrics
  let classMetrics: Metric[] = [];
  vectorConfig.classKeys.forEach((classProperty) => {
    const classes = clippedFeatureColl.features.reduce<
      Record<string, { count: number; area: number }>
    >((classesSoFar, feat) => {
      if (!feat.properties) throw new Error("Missing properties");
      if (!vectorConfig.classKeys) throw new Error("Missing classProperty");
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
    }, {});

    Object.keys(classes).forEach((curClass: string) => {
      classMetrics.push(
        createMetric({
          geographyId: geography.geographyId,
          classId: vectorConfig.datasourceId + "-" + curClass,
          metricId: "count",
          value: classes[curClass].count,
        })
      );
      classMetrics.push(
        createMetric({
          geographyId: geography.geographyId,
          classId: vectorConfig.datasourceId + "-" + curClass,
          metricId: "area",
          value: classes[curClass].area,
        })
      );
    });

    // Creates empty metrics for features classes lost during clipping
    featureCollClasses[classProperty].forEach((curClass) => {
      if (!Object.keys(classes).includes(curClass)) {
        classMetrics.push(
          createMetric({
            geographyId: geography.geographyId,
            classId: vectorConfig.datasourceId + "-" + curClass,
            metricId: "count",
            value: 0,
          })
        );
        classMetrics.push(
          createMetric({
            geographyId: geography.geographyId,
            classId: vectorConfig.datasourceId + "-" + curClass,
            metricId: "area",
            value: 0,
          })
        );
      }
    });
  });

  return totalMetrics.concat(classMetrics);
}

/**
 * Builds JSON path from dist folder path and datasourceId
 * @param dstPath string path to dist folder
 * @param datasourceId string id for datasource
 * @returns string path to datasource file
 */
function getJsonPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".json";
}
