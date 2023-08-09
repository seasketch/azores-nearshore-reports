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
  isInternalRasterDatasource,
  isInternalVectorDatasource,
} from "@seasketch/geoprocessing";

export interface Geography {
  geographyId: string;
  datasourceId: string;
  display: string;
}

/**
 * Function called in 'npm run precalc' command
 * Loops through datasources and geographies to calculate all
 * precalc metrics. Outputs to precalc.json
 */
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
      datasource.geo_type === "vector"
        ? (metrics = metrics.concat(
            await precalcVectorDatasource(
              datasource as InternalVectorDatasource,
              geography
            )
          ))
        : (metrics = metrics.concat(
            await precalcRasterDatasource(
              datasource as InternalRasterDatasource,
              geography
            )
          ));
    }
  }
  console.log("Writing to project/precalc.json");

  fs.writeJsonSync("project/precalc.json", { metrics: metrics }, { spaces: 4 });
}

precalcAll();
