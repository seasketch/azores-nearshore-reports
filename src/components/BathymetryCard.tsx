import React from "react";
import { ResultsCard, KeySection } from "@seasketch/geoprocessing/client-ui";
import { useTranslation } from "react-i18next";
import { BathymetryResults, GeoProp } from "../types";
import { ReportProps } from "../util/ReportProp";
import project from "../../project";

const formatDepth = (val: number) => {
  if (!val) return "0m";
  const baseVal = Math.abs(parseInt(val.toString()));
  return val <= 0 ? `-${baseVal}m` : `+${baseVal}m`;
};

export const BathymetryCard: React.FunctionComponent<ReportProps> = (props) => {
  const { t, i18n } = useTranslation();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  return (
    <ResultsCard
      title={t("Depth")}
      functionName="bathymetry"
      extraParams={{ geographyIds: [curGeography.geographyId] }}
    >
      {(data: BathymetryResults) => {
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
