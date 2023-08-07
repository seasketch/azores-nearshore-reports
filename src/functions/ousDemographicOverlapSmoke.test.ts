/**
 * @jest-environment node
 * @group smoke
 */
import handler from "./ousDemographicOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof handler.func).toBe("function");
  });
  test("ousDemographicOverlap - tests run against all examples", async () => {
    // data fetch fails if run all sketches, too many requests?
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await handler.func(example, {
        geographies: ["nearshore"],
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
