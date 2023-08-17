import { Geography } from "../types";
import geographies from "../../project/geographies.json";

/**
 * Takes geographyId and returns Geography object
 * @param geographyId: geographyId
 * @returns Geography
 */
export const getGeographyById = (geographyId: string): Geography => {
  const geography = geographies.find((g) => g.geographyId === geographyId);
  if (!geography) {
    throw new Error(`Geography not found - ${geographyId}`);
  } else {
    return geography;
  }
};
