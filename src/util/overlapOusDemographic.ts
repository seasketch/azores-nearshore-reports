const { performance } = require("perf_hooks");
import { spawn, Thread, Worker, FunctionThread } from "threads";
import { OverlapOusDemographicWorker } from "./overlapOusDemographicWorker";
import {
  Feature,
  Polygon,
  FeatureCollection,
  Metric,
  MultiPolygon,
  Nullable,
  Sketch,
  SketchCollection,
} from "@seasketch/geoprocessing";

export interface OusFeatureProperties {
  resp_id: number;
  weight: number;
  island?: Nullable<string>;
  sector?: Nullable<string>;
  gear?: Nullable<string>;
  number_of_ppl: string | number;
}

export type OusFeature = Feature<MultiPolygon | Polygon, OusFeatureProperties>;
export type OusFeatureCollection = FeatureCollection<
  MultiPolygon | Polygon,
  OusFeatureProperties
>;

export interface BaseCountStats {
  respondents: number;
  people: number;
}

export type ClassCountStats = Record<string, BaseCountStats>;

export interface OusStats extends BaseCountStats {
  bySector: ClassCountStats;
  byIsland: ClassCountStats;
  byGear: ClassCountStats;
}

export type OusReportResult = {
  stats: OusStats;
  metrics: Metric[];
};

/**
  Calculates demographics of ocean use within a sketch

  Weight - includes 0-100 normalized and also unnormalized up to 4500
  Island - one assigned island value per respondent
  Sector - one per respondent, except for bait fishing, which is only/also asked if tuna fishing is selected by respondent
  Gear - one or more per shape (list where each element separated by 3 spaces), answered by respondent per shape
  Number of people - answered once per respondent, gets joined in from respondents csv to each shape.  This means it's answered effectively once per sector, except for bait fishing.

  What this means we can do with the data:
  * number of respondents (unique respondent_id's) is not equal to number of people surveyed.  Someone could respond to the survey multiples times, for a different sector each time
    * The names of the people and their island can be used to better uniquely identify people but also not perfect.  This report doesn't attempt to use names
  * number_of_ppl is therefore also an approximation.
 */
export async function overlapOusDemographic(
  /** ous shape polygons */
  shapes: OusFeatureCollection,
  /** optionally calculate stats for OUS shapes that overlap with sketch  */
  sketch?:
    | Sketch<Polygon | MultiPolygon>
    | SketchCollection<Polygon | MultiPolygon>
) {
  // Performance testing
  let start = performance.now();

  // Sort by respondent_id
  const sortedShapes = shapes.features.sort(
    (a, b) => a.properties.resp_id - b.properties.resp_id
  );

  // Divide shapes into 6 groups (# lambda cores) to be run in
  // worker threads while being respondent-safe
  const workerShapes: OusFeatureCollection[] = [];
  let sIndex = 0; // Starting shapes index for worker
  let eIndex = 0; // Ending shapes index for worker
  for (
    let index = Math.ceil(sortedShapes.length / 6);
    index <= Math.ceil(sortedShapes.length / 6) * 6;
    index += Math.ceil(sortedShapes.length / 6)
  ) {
    if (index === Math.ceil(sortedShapes.length / 6) * 6) {
      // If last worker group
      workerShapes.push({
        ...shapes,
        features: sortedShapes.slice(sIndex),
      });
    } else {
      // All others cases
      eIndex = index;
      while (
        sortedShapes[eIndex].properties.resp_id ===
        sortedShapes[index - 1].properties.resp_id
      ) {
        // Don't split a respondent's shapes into multiple workers or they are double-counted
        eIndex++;
      }
      workerShapes.push({
        ...shapes,
        features: sortedShapes.slice(sIndex, eIndex),
      });
      sIndex = eIndex;
    }
  }

  // Used to terminate workers after return
  const workers: FunctionThread[] = [];

  // Start workers
  const promises: Promise<OusReportResult>[] = workerShapes.map(
    async (shapes) => {
      const worker = await spawn<OverlapOusDemographicWorker>(
        new Worker("./overlapOusDemographicWorker")
      );
      workers.push(worker);
      return worker(shapes, sketch);
    }
  );

  // Await results
  const results: OusReportResult[] = await Promise.all(promises);

  // Terminate workers
  workers.forEach(async (worker) => {
    await Thread.terminate(worker);
  });

  // Performance testing
  let end = performance.now();
  console.log(
    "Sketch",
    sketch?.properties.name,
    "runtime is",
    (end - start) / 1000
  );

  // Combine metrics from worker threads
  const firstResult: OusReportResult = JSON.parse(
    JSON.stringify(results.shift()) // pops first result to use as base
  );

  const finalResult = results.reduce((finalResult, result) => {
    // stats

    finalResult.stats.respondents += result.stats.respondents;
    finalResult.stats.people += result.stats.people;

    // stats.bySector
    for (const sector in result.stats.bySector) {
      if (finalResult.stats.bySector[sector]) {
        finalResult.stats.bySector[sector].people +=
          result.stats.bySector[sector].people;
        finalResult.stats.bySector[sector].respondents +=
          result.stats.bySector[sector].respondents;
      } else {
        finalResult.stats.bySector[sector] = {
          people: result.stats.bySector[sector].people,
          respondents: result.stats.bySector[sector].respondents,
        };
      }
    }

    // stats.byIsland
    for (const island in result.stats.byIsland) {
      if (finalResult.stats.byIsland[island]) {
        finalResult.stats.byIsland[island].people +=
          result.stats.byIsland[island].people;
        finalResult.stats.byIsland[island].respondents +=
          result.stats.byIsland[island].respondents;
      } else {
        finalResult.stats.byIsland[island] = {
          people: result.stats.byIsland[island].people,
          respondents: result.stats.byIsland[island].respondents,
        };
      }
    }

    // stats.byGear
    for (const gear in result.stats.byGear) {
      if (finalResult.stats.byGear[gear]) {
        finalResult.stats.byGear[gear].people +=
          result.stats.byGear[gear].people;
        finalResult.stats.byGear[gear].respondents +=
          result.stats.byGear[gear].respondents;
      } else {
        finalResult.stats.byGear[gear] = {
          people: result.stats.byGear[gear].people,
          respondents: result.stats.byGear[gear].respondents,
        };
      }
    }

    // metrics

    result.metrics.forEach((metric) => {
      const index = finalResult.metrics.findIndex(
        (finalMetric) =>
          finalMetric.metricId === metric.metricId &&
          finalMetric.classId === metric.classId &&
          finalMetric.sketchId === metric.sketchId
      );
      if (index === -1) {
        finalResult.metrics.push(JSON.parse(JSON.stringify(metric)));
      } else {
        finalResult.metrics[index].value += metric.value;
      }
    });

    return finalResult;
  }, firstResult);

  return finalResult;
}
