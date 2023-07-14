import fs from "fs-extra";
import {
  InternalRasterDatasource,
  InternalVectorDatasource,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";
import { precalcVectorDatasource } from "./precalcVectorDatasource";
import { precalcRasterDatasource } from "./precalcRasterDatasource";
import { Metric, createMetric } from "@seasketch/geoprocessing";

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
  const ds: InternalRasterDatasource | InternalVectorDatasource =
    project.getDatasourceById(
      "PA_Bulweria_bulwerii_baseline"
    ) as InternalRasterDatasource;

  const geographies = fs.readJSONSync(
    "project/geographies.json"
  ) as Geography[];

  const denominators: Metric[][] = await Promise.all(
    geographies.map(async (geography: Geography) => {
      const keyStats: Stat[] =
        //ds.geo_type === "vector"
        //? await precalcVectorDatasource(ds, geography)
        await precalcRasterDatasource(ds, geography);

      console.log("key stats", JSON.stringify(keyStats));

      return keyStats.map((keyStat) => {
        return createMetric({
          geographyId: geography.geographyId,
          classId: keyStat.class
            ? ds.datasourceId + " - " + keyStat.class
            : ds.datasourceId,
          metricId: keyStat.type,
          value: keyStat.value,
        });
      });
    })
  );

  const denoms: Metric[] = denominators.flat();

  console.log(JSON.stringify(denoms));

  fs.writeFileSync("project/precalc.json", JSON.stringify({ metrics: denoms }));
}

precalc();
