import React from "react";
import { SDMCard } from "./SDMCard";
import { Geomorphology } from "./Geomorphology";
import { BathymetryCard } from "./BathymetryCard";
import { ReportProps } from "../util/ReportProp";

const ReportPage: React.FunctionComponent<ReportProps> = (props) => {
  return (
    <>
      <BathymetryCard
        geographyId={props.geographyId}
        printing={props.printing}
      />
      <SDMCard geographyId={props.geographyId} printing={props.printing} />
      <Geomorphology
        geographyId={props.geographyId}
        printing={props.printing}
      />
    </>
  );
};

export default ReportPage;
