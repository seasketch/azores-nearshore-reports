/**
 * @jest-environment node
 * @group unit
 */
import { Feature, Polygon } from "@seasketch/geoprocessing";
import { bathyStats } from "./bathymetry";
// @ts-ignore
import parseGeoraster from "georaster";

const values = [
  [
    [0, 1, 2],
    [0, 0, 0],
    [2, 1, 1],
  ],
];
const noDataValue = 3;
const projection = 4326;
const xmin = 10; // left
const ymax = 13; // top
const pixelWidth = 1;
const pixelHeight = 1;
const metadata = {
  noDataValue,
  projection,
  xmin,
  ymax,
  pixelWidth,
  pixelHeight,
};

// Overlaps with bottom row of raster
const poly: Feature<Polygon> = {
  type: "Feature",
  properties: [],
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [9, 9],
        [9, 11],
        [14, 11],
        [14, 9],
        [9, 9],
      ],
    ],
  },
};

describe("Bathymetry unit tests", () => {
  it("correctly calculates bathyStats", async () => {
    const georaster = await parseGeoraster(values, metadata);
    const result = await bathyStats([poly], georaster);
    expect(result.min).toBe(1);
    expect(result.max).toBe(2);
    expect(result.mean).toBeCloseTo(1.33);
  });
});
