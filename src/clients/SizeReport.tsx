import React, { useState } from "react";
import Translator from "../components/TranslatorAsync";
import { SizeCard } from "../components/SizeCard";
import { Card } from "@seasketch/geoprocessing/client-ui";
import project from "../../project";

export const SizeReport = () => {
  const [geography, setGeography] = useState("nearshore");

  const geographySwitcher = (e: any) => {
    setGeography(e.target.value);
  };
  return (
    <Translator>
      <Card>
        <p>
          Nearshore planning area:{" "}
          <select onChange={geographySwitcher}>
            {project.geographies.map((geography) => {
              return (
                <option value={geography.geographyId}>
                  {geography.display}
                </option>
              );
            })}
          </select>
        </p>
      </Card>
      <SizeCard geographyId={geography} />
    </Translator>
  );
};
