import React from "react";
import { SDMCard } from "./SDMCard";
import { Geomorphology } from "./Geomorphology";
import { GeoProp } from "../types";
import { BathymetryCard } from "./BathymetryCard";

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      <BathymetryCard geographyId={props.geographyId} />
      <SDMCard geographyId={props.geographyId} />
      <Geomorphology geographyId={props.geographyId} />
    </>
  );
};

export default ReportPage;
