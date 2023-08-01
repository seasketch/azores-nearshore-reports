import React from "react";
import {
  ResultsCard,
  KeySection,
  ToolbarCard,
} from "@seasketch/geoprocessing/client-ui";
import { BathymetryResults } from "../util/BathymetryResults";
import { useTranslation } from "react-i18next";

const Percent = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
});

const formatDepth = (val: number) => {
  const baseVal = Math.abs(parseInt(val.toString()));
  return val <= 0 ? `-${baseVal}m` : `+${baseVal}m`;
};

export const BathymetryCard: React.FunctionComponent = () => {
  const { t, i18n } = useTranslation();
  return (
    <ResultsCard title={t("Depth")} functionName="bathymetry">
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
