/**
 * @jest-environment node
 * @group smoke
 */
import { ousByIslandValueOverlap } from "./ousByIslandValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousByIslandValueOverlap).toBe("function");
  });
  test("ousByIslandValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousByIslandValueOverlap(example, {
        geographies: ["nearshore"],
      });
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "ousByIslandValueOverlap",
        example.properties.name
      );
    }
  }, 120000);
});
