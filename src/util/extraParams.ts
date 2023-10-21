import { DefaultExtraParams } from "../types";

/**
 * Extracts, validates, and returns geographyId from extraParams
 * @param params parameter object
 * @returns the first geographyId in the geographyIds array
 * @throws if geographyIds is missing or empty
 */
export const getGeographyIdFromParam = <P extends DefaultExtraParams>(
  params: P
): string => {
  const geographyIds = getParamStringArray("geographyIds", params);
  if (!geographyIds || geographyIds.length === 0)
    throw new Error("At least one geographyId required");
  return geographyIds[0];
};

/**
 * Validates and returns string[] parameter from extraParams.  If param missing it returns an empty array
 * @param paramName name of array parameter to extract from extraParams
 * @param params parameter object
 * @returns string[]
 * @throws Error if parameter contains non-string values
 */
export const getParamStringArray = <P extends DefaultExtraParams>(
  paramName: string,
  params: P
): string[] | undefined => {
  const paramValue = params[paramName as keyof P];
  if (Array.isArray(paramValue)) {
    if (paramValue.length === 0) {
      console.log(`Parameter ${paramName} is an empty array`);
      return undefined;
    }
    paramValue.forEach((arrayVal) => {
      if (typeof arrayVal !== "string") {
        throw new Error(
          `${paramName} must contain all strings, received ${JSON.stringify(
            arrayVal
          )}`
        );
      }
    });
    return paramValue;
  }
  return undefined;
};
