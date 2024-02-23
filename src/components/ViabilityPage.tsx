import React from "react";
import { SizeCard } from "./SizeCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { OUSCard } from "./OUSCard";
import { OusDemographics } from "./OusDemographic";
import { OUSByIslandCard } from "./OUSByIslandCard";
import { ProtectionCard } from "./ProtectionCard";
import { GFWFishingEffort } from "./GFWFishingEffort";
import { ReportProps } from "../util/ReportProp";

const ReportPage: React.FunctionComponent<ReportProps> = (props) => {
  return (
    <>
      <ProtectionCard printing={props.printing} />
      <SizeCard geographyId={props.geographyId} printing={props.printing} />
      <OUSCard geographyId={props.geographyId} printing={props.printing} />
      <OUSByIslandCard
        hidden={props.geographyId === "nearshore"}
        geographyId={props.geographyId}
        printing={props.printing}
      />
      <OusDemographics
        geographyId={props.geographyId}
        printing={props.printing}
      />
      <GFWFishingEffort
        geographyId={props.geographyId}
        printing={props.printing}
      />
      {!props.printing && <SketchAttributesCard autoHide />}
    </>
  );
};

export default ReportPage;
