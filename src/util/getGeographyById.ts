import { Geography } from "../types";
import geographies from "../../project/geographies.json";

/**
 * Returns project geography matching the provided ID, with optional fallback geography using fallbackGroup parameter
 * @param geographyId The geography ID to search for
 * @param options
 * @param options.fallbackGroup The default group name to lookup if no geographyId is provided. expects there is only one geography with that group name
 * @returns
 */
export const getGeographyById = (
  geographyId: string,
  options: { fallbackGroup?: string } = {}
): Geography => {
  const { fallbackGroup } = options;
  if (geographyId && geographyId.length > 0) {
    const curGeog = geographies.find((g) => g.geographyId === geographyId);
    // verify matching geography exists
    if (curGeog) {
      return curGeog;
    }
  } else if (fallbackGroup) {
    // fallback to user-specified geography group
    const planGeogs = geographies.filter((g) =>
      g.groups?.includes(fallbackGroup)
    );
    if (planGeogs.length === 0) {
      throw new Error(
        `Could not find geography with fallback group ${fallbackGroup}`
      );
    } else if (planGeogs.length > 1) {
      throw new Error(
        `Found more than one geography with fallback group ${fallbackGroup}, there should be only one`
      );
    } else {
      return planGeogs[0];
    }
  }

  throw new Error(`Could not find geography matching ${geographyId}`);
};
