/**
 * @jest-environment node
 * @group smoke
 */
import { boundaryAreaOverlap } from "./boundaryAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof boundaryAreaOverlap).toBe("function");
  });
  test("boundaryAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await boundaryAreaOverlap(example, {
        geographyIds: ["nearshore"],
      });
      expect(result).toBeTruthy();
      writeResultOutput(result, "boundaryAreaOverlap", example.properties.name);
    }
  }, 120000);
});
