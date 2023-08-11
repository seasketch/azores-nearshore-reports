import React from "react";
import { SDMCard } from "./SDMCard";
import { Geomorphology } from "./Geomorphology";
import { GeoProp } from "../util/types";

const ReportPage: React.FunctionComponent<GeoProp> = (props) => {
  return (
    <>
      <SDMCard geography={props.geography} />
      <Geomorphology geography={props.geography} />
    </>
  );
};

export default ReportPage;
