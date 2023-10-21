/**
 * @jest-environment node
 * @group smoke
 */
import { ousValueOverlap } from "./ousValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousValueOverlap).toBe("function");
  });
  test("ousValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousValueOverlap(example, {
        geographyIds: ["nearshore"],
      });
      expect(result).toBeTruthy();
      writeResultOutput(result, "ousValueOverlap", example.properties.name);
    }
  }, 120000);
});
