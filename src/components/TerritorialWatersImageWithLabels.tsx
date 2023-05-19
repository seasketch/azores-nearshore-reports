import React from "react";
import { useTranslation } from "react-i18next";
import { TerritorialWatersBackgroundSimple } from "./TerritorialWatersBackgroundSimple";

/** Type accepted by TerritorialWatersImage to set translatable text labels  */
interface Label {
  key: string;
  labelText?: string;
  x?: string | number;
  y?: string | number;
  style?: React.CSSProperties;
}

/** Array of Labels to be inserted into the territorial waters svg */
export interface LabelProps {
  /** overrides default labels with same key id, otherwise adds as new label */
  labels?: Label[];
}

/** Serves up a translatable SVG image showing nautical boundaries */
export const TerritorialWatersImageWithLabels: React.FunctionComponent<LabelProps> =
  ({ labels }) => {
    // Allows translation of labels
    const { t } = useTranslation();

    // Default labels for land, shoreline, nearshore, offshore, and EEZ
    const landLabel = t("Land");
    const shorelineLabel = t("Shoreline");
    const nearshoreLabel = t("Nearshore\n(0-12 nautical miles)");
    const offshoreLabel = t("Offshore\n(12-200 nautical miles)");
    const eezLabel = t("Exclusive Economic Zone\n(0-200 nautical miles)");

    const labelsFinal: Label[] = [
      { key: "land", labelText: landLabel, x: 220, y: 650 },
      { key: "shoreline", labelText: shorelineLabel, x: 400, y: 580 },
      {
        key: "nearshore",
        labelText: nearshoreLabel,
        x: 160,
        y: 480,
      },
      {
        key: "offshore",
        labelText: offshoreLabel,
        x: 320,
        y: 350,
      },
      {
        key: "eez",
        labelText: eezLabel,
        x: 50,
        y: 300,
      },
    ].map((label) => ({
      //Adding default style
      ...label,
      style: { font: "12pt Helvetica, Arial, sans-serif", whiteSpace: "pre" },
    }));

    // If no user-generated labels, use defaults
    labels?.forEach((label) => {
      // Find matching label if exists
      const foundIndex = labelsFinal.findIndex(
        (curLabel) => label.key === curLabel.key
      );

      // If no matching label key, add label
      if (foundIndex === -1) labelsFinal.push(label);
      else {
        // If matching label found, update it
        labelsFinal[foundIndex] = {
          ...labelsFinal[foundIndex],
          ...label,
          style: {
            ...labelsFinal[foundIndex].style,
            ...label.style,
          },
        };
      }
    });

    return (
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">
          <TerritorialWatersBackgroundSimple />

          {/* Generates labels based on labels param or defaults */}
          {labelsFinal.map((label) => (
            <text key={label.key} x={label.x} y={label.y} style={label.style}>
              {label.labelText}
            </text>
          ))}
        </svg>
      </div>
    );
  };
