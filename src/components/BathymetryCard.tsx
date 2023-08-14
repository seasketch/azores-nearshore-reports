import React from "react";
import { ResultsCard, KeySection } from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";
import { BathymetryResults, GeoProp } from "../util/types";

const formatDepth = (val: number) => {
  const baseVal = Math.abs(parseInt(val.toString()));
  return val <= 0 ? `-${baseVal}m` : `+${baseVal}m`;
};

export const BathymetryCard: React.FunctionComponent<GeoProp> = (props) => {
  const { t, i18n } = useTranslation();
  return (
    <ResultsCard
      title={t("Depth")}
      functionName="bathymetry"
      extraParams={{ geographies: [props.geographyId] }}
    >
      {(data: BathymetryResults) => {
        if (!data || !data.max) {
          console.error(`No bathymetry results for ${props.geographyId}`);
          data = { max: 0, min: 0, mean: 0, units: "meters" };
        }
        return (
          <>
            <KeySection
              style={{ display: "flex", justifyContent: "space-around" }}
            >
              <span>
                {t("Min")}: <b>{formatDepth(data.max)}</b>
              </span>
              <span>
                {t("Avg")}: <b>{formatDepth(data.mean)}</b>
              </span>
              <span>
                {t("Max")}: <b>{formatDepth(data.min)}</b>
              </span>
            </KeySection>
          </>
        );
      }}
    </ResultsCard>
  );
};
