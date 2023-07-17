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
  datasourcesSchema,
  statsSchema,
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

async function precalc() {
  const geographies = fs.readJSONSync(
    "project/geographies.json"
  ) as Geography[];

  let datasources = ["PA_Bulweria_bulwerii_baseline", "shelf_class"];

  let metrics: Metric[] = [];

  await Promise.all(
    geographies.map(async (geography: Geography) => {
      await Promise.all(
        datasources.map(async (datasourceId: string) => {
          const keyStats: Stat[] =
            project.getDatasourceById(datasourceId).geo_type === "vector"
              ? await precalcVectorDatasource(
                  project.getDatasourceById(
                    datasourceId
                  ) as InternalVectorDatasource,
                  geography
                )
              : await precalcRasterDatasource(
                  project.getDatasourceById(
                    datasourceId
                  ) as InternalRasterDatasource,
                  geography
                );

          console.log("key stats", JSON.stringify(keyStats));

          metrics = metrics.concat(
            keyStats.map((keyStat) => {
              return createMetric({
                geographyId: geography.geographyId,
                classId: keyStat.class,
                metricId: keyStat.type,
                value: keyStat.value,
                extra: { datasourceId: datasourceId },
              });
            })
          );
        })
      );
    })
  );

  fs.writeFileSync(
    "project/precalc.json",
    JSON.stringify({ metrics: metrics })
  );
}

precalc();
