/**
 * @jest-environment node
 * @group smoke
 */
import { ousDemographicOverlap } from "./ousDemographicOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousDemographicOverlap).toBe("function");
  });
  test("ousDemographicOverlapSmoke - tests run against all examples", async () => {
    // data fetch fails if run all sketches, too many requests?
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousDemographicOverlap(example, {
        geographyIds: ["nearshore"],
      });
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "ousDemographicOverlap",
        example.properties.name
      );
    }
  }, 500000);
});
