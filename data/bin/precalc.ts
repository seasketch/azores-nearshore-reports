import fs from "fs-extra";
import {
  InternalRasterDatasource,
  InternalVectorDatasource,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";
import { precalcVectorDatasource } from "./precalcVectorDatasource";
import { precalcRasterDatasource } from "./precalcRasterDatasource";
import {
  Metric,
  createMetric,
  isInternalRasterDatasource,
  isInternalVectorDatasource,
} from "@seasketch/geoprocessing";

export interface Geography {
  geographyId: string;
  datasourceId: string;
  display: string;
}

export interface Stat {
  class: string | null;
  type: string;
  value: number;
}

async function precalcAll() {
  const geographies = fs.readJSONSync(
    "project/geographies.json"
  ) as Geography[];

  const datasources = project.datasources.filter(
    (ds) => isInternalRasterDatasource(ds) || isInternalVectorDatasource(ds)
  );

  let metrics: Metric[] = [];

  for (let geography of geographies) {
    for (let datasource of datasources) {
      const keyStats: Stat[] =
        datasource.geo_type === "vector"
          ? await precalcVectorDatasource(
              datasource as InternalVectorDatasource,
              geography
            )
          : await precalcRasterDatasource(
              datasource as InternalRasterDatasource,
              geography
            );

      console.log(
        "key stats",
        datasource.datasourceId,
        geography.geographyId,
        JSON.stringify(keyStats)
      );

      metrics = metrics.concat(
        keyStats.map((keyStat) => {
          return createMetric({
            geographyId: geography.geographyId,
            classId: datasource.datasourceId + "-" + keyStat.class,
            metricId: keyStat.type,
            value: keyStat.value,
          });
        })
      );
    }
  }
  console.log("Writing to project/precalc.json");

  fs.writeJsonSync("project/precalc.json", { metrics: metrics }, { spaces: 4 });
}

precalcAll();
