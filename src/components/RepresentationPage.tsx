import React from "react";
import { SDMCard } from "./SDMCard";
import { Geomorphology } from "./Geomorphology";
import Translator from "./TranslatorAsync";

export interface GeoProp {
  geography: string;
}

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      {props.geography}
      <SDMCard geography={props.geography} />
      <Geomorphology />
    </>
  );
};

export default ReportPage;
