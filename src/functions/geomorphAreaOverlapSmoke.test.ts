/**
 * @jest-environment node
 * @group smoke
 */
import { geomorphAreaOverlap } from "./geomorphAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof geomorphAreaOverlap).toBe("function");
  });
  test("geomorphAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await geomorphAreaOverlap(example, {
        geographies: ["nearshore"],
      });
      expect(result).toBeTruthy();
      writeResultOutput(result, "geomorphAreaOverlap", example.properties.name);
    }
  }, 120000);
});
