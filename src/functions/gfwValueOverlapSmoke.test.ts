/**
 * @jest-environment node
 * @group smoke
 */
import { gfwValueOverlap } from "./gfwValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof gfwValueOverlap).toBe("function");
  });
  test("gfwValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await gfwValueOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "gfwValueOverlap", example.properties.name);
    }
  }, 60000);
});
