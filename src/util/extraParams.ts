import { ExtraParams } from "../types";

/**
 * Validates and returns string[] parameter from extraParams
 * @param param string name of parameter to extract from extraParams
 * @param extraParams parameters passed from client to GP function
 * @returns string[]
 */
export const getParamStringArray = (
  param: string,
  extraParams: ExtraParams
): string[] => {
  const value = extraParams[param as keyof ExtraParams];
  if (!Array.isArray(value)) {
    throw new Error(
      `${param} is not an array of strings in ExtraParams -- ${value}`
    );
  } else if (!value.length) {
    throw new Error(`${param} is empty in ExtraParams`);
  } else if (typeof value[0] !== "string") {
    throw new Error(
      `${param} array does not contain strings as expected in ExtraParams`
    );
  } else return value;
};
