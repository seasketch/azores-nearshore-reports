import React from "react";
import { SizeCard } from "./SizeCard";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import { OUSCard } from "./OUSCard";
import { OusDemographics } from "./OusDemographic";
import { OUSByIslandCard } from "./OUSByIslandCard";
import { GeoProp } from "../clients/MpaTabReport";

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      <SizeCard geography={props.geography} />
      <OUSCard geography={props.geography} />
      <OUSByIslandCard
        hidden={props.geography === "nearshore"}
        geography={props.geography}
      />
      <OusDemographics />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
