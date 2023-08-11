import React from "react";
import { SizeCard } from "./SizeCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { OUSCard } from "./OUSCard";
import { OusDemographics } from "./OusDemographic";
import { OUSByIslandCard } from "./OUSByIslandCard";
import { ProtectionCard } from "./ProtectionCard";
import { BathymetryCard } from "./BathymetryCard";
import { GeoProp } from "../util/types";

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      <ProtectionCard />
      <SizeCard geography={props.geography} />
      <BathymetryCard geography={props.geography} />
      <OUSCard geography={props.geography} />
      <OUSByIslandCard
        hidden={props.geography === "nearshore"}
        geography={props.geography}
      />
      <OusDemographics geography={props.geography} />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
