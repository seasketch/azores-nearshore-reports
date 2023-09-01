import React, { useState } from "react";
import {
  SegmentControl,
  ReportPage,
  Card,
} from "@seasketch/geoprocessing/client-ui";
import ViabilityPage from "../components/ViabilityPage";
import RepresentationPage from "../components/RepresentationPage";
import { useTranslation } from "react-i18next";
import { Translator } from "../components/TranslatorAsync";
import geographies from "../../project/geographies.json";

const enableAllTabs = false;

const MpaTabReport = () => {
  const { t } = useTranslation();
  const viabilityId = "viability";
  const representationId = "representation";
  const segments = [
    { id: viabilityId, label: t("Viability") },
    { id: representationId, label: t("Representation") },
  ];
  const [tab, setTab] = useState<string>(viabilityId);
  const [geography, setGeography] = useState("nearshore");

  const geographySwitcher = (e: any) => {
    setGeography(e.target.value);
  };
  return (
    <>
      <Card>
        <p>
          {t("Nearshore Planning Area")}
          {": "}
          <select onChange={geographySwitcher}>
            {geographies.map((geography) => {
              return (
                <option
                  key={geography.geographyId}
                  value={geography.geographyId}
                >
                  {geography.display}
                </option>
              );
            })}
          </select>
        </p>
      </Card>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={segments}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== viabilityId}>
        <ViabilityPage geographyId={geography} />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== representationId}>
        <RepresentationPage geographyId={geography} />
      </ReportPage>
    </>
  );
};

export default function () {
  // Translator must be in parent FunctionComponent in order for ReportClient to use useTranslate hook
  return (
    <Translator>
      <MpaTabReport />
    </Translator>
  );
}
