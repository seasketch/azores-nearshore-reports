import React from "react";
import { SizeCard } from "./SizeCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { OUSCard } from "./OUSCard";
import { OusDemographics } from "./OusDemographic";
import { OUSByIslandCard } from "./OUSByIslandCard";
import { ProtectionCard } from "./ProtectionCard";
import { GeoProp } from "../types";
import { GFWFishingEffort } from "./GFWFishingEffort";

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      <ProtectionCard />
      <SizeCard geographyId={props.geographyId} />
      <OUSCard geographyId={props.geographyId} />
      <OUSByIslandCard
        hidden={props.geographyId === "nearshore"}
        geographyId={props.geographyId}
      />
      <OusDemographics geographyId={props.geographyId} />
      <GFWFishingEffort geographyId={props.geographyId} />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
