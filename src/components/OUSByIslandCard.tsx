import React, { useState } from "react";
import {
  Collapse,
  ResultsCard,
  ClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  metricsWithSketchId,
  sortMetrics,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";
import { Trans, useTranslation } from "react-i18next";
import {
  getPrecalcMetrics,
  toPercentMetric,
} from "../../data/bin/getPrecalcMetrics";
import { GeoProp } from "../clients/MpaTabReport";

// Mapping island ids to display names for report
const islands: { [id: string]: string } = {};
islands["corvo"] = "Corvo";
islands["pico"] = "Pico";
islands["saojorge"] = "São Jorge";
islands["saomiguel"] = "São Miguel";
islands["terceira"] = "Terceira";
islands["flores"] = "Flores";
islands["faial"] = "Faial";
islands["santamaria"] = "Santa Maria";
islands["graciosa"] = "Graciosa";

export const OUSByIslandCard: React.FunctionComponent<GeoProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t, i18n } = useTranslation();
  const metricGroup = project.getMetricGroup("ousByIslandValueOverlap");
  const precalcMetrics = getPrecalcMetrics(metricGroup, "sum", props.geography);
  const mapLabel = t("Map");
  const sectorLabel = t("Sector");
  const percValueLabel = t("% Value Found Within Plan");

  const [island, setIslandVisible] = useState("corvo");

  const islandSwitcher = (e: any) => {
    setIslandVisible(e.target.value);
  };

  return (
    <>
      <ResultsCard
        title={t("Ocean Use - By Island")}
        functionName="ousByIslandValueOverlap"
      >
        {(data: ReportResult) => {
          // Single sketch or collection top-level
          const parentMetrics = metricsWithSketchId(
            toPercentMetric(
              data.metrics.filter((m) => m.metricId === metricGroup.metricId),
              precalcMetrics
            ),
            [data.sketch.properties.id]
          );

          const sortedMetrics = sortMetrics(parentMetrics);

          // grouping metrics by island prefix
          const groupedMetrics = sortedMetrics.reduce<Record<string, any>>(
            (groups, metric) => {
              // get island id from classId prefix (i.e. "corvo", "saomiguel", "all")
              const island: string | undefined = metric.classId?.substring(
                0,
                metric.classId?.indexOf("_")
              );
              // if there's no island prefix, make a note and skip it
              if (!island) {
                console.log("Expected island id");
                return groups;
              }

              // adds metric to the island's metric array
              groups[island] = [...(groups[island] || []), metric];
              return groups;
            },
            {}
          );

          return (
            <>
              <Trans i18nKey="OUS By Island Card">
                <p>
                  This report summarizes the percentage of activities that
                  overlap with ocean use by island inhabitants, as reported in
                  the Ocean Use Survey. Plans should consider the potential
                  impact to sectors if access or activities are restricted.
                </p>
              </Trans>

              {t("Ocean use by ")}
              <select onChange={islandSwitcher}>
                {Object.keys(islands).map((island: string) => {
                  return <option value={island}>{islands[island]}</option>;
                })}
              </select>
              {t(" inhabitants represented in Ocean Use Survey.")}

              <ClassTable
                rows={groupedMetrics[island]}
                metricGroup={metricGroup}
                columnConfig={[
                  {
                    columnLabel: sectorLabel,
                    type: "class",
                    width: 45,
                  },
                  {
                    columnLabel: percValueLabel,
                    type: "metricChart",
                    metricId: metricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 45,
                  },
                  {
                    columnLabel: mapLabel,
                    type: "layerToggle",
                    width: 10,
                  },
                ]}
              />
              <Collapse title={t("Learn more")}>
                <Trans i18nKey="OUS By Island Card - learn more">
                  <p>
                    ℹ️ Overview: to capture the value each sector places on
                    different areas of the nearshore, an Ocean Use Survey was
                    conducted. Individuals identified the sectors they
                    participate in, and were asked to draw the areas they use
                    relative to that sector and assign a value of importance.
                    Individual responses were then combined to produce aggregate
                    heatmaps by sector. This allows the value of areas to be
                    quantified, summed, and compared to one another as more or
                    less valuable.
                  </p>
                  <p>
                    Value is then used as a proxy for measuring the potential
                    economic loss to sectors caused by the creation of protected
                    areas. This report can be used to minimize the potential
                    impact of a plan on a sector, as well as identify and reduce
                    conflict between conservation objectives and sector
                    activities. The higher the proportion of value within the
                    plan, the greater the potential impact to the fishery if
                    access or activities are restricted.
                  </p>
                  <p>
                    Note, the resulting heatmaps are only representative of the
                    individuals that were surveyed.
                  </p>
                  <p>
                    🎯 Planning Objective: there is no specific objective/target
                    for limiting the potential impact to fishing activities.
                  </p>
                  <p>🗺️ Methods:</p>
                  <ul>
                    <li>
                      <a
                        href="https://seasketch.github.io/python-sap-map/index.html"
                        target="_blank"
                      >
                        Spatial Access Priority Mapping Overview
                      </a>
                    </li>
                  </ul>
                  <p>
                    📈 Report: Percentages are calculated by summing the areas
                    of value within the MPAs in this plan, and dividing it by
                    all sector value. If the plan includes multiple areas that
                    overlap, the overlap is only counted once.
                  </p>
                  <p>
                    This report shows the percentage of EEZ-wide value of this
                    island's fishers which is contained by the nearshore plan.
                    For example, "By island: Corvo" will display % value of
                    Corvo fishers contained within the plan. Toggle the
                    corresponding maps to see the data layers used in analysis.
                  </p>
                </Trans>
              </Collapse>
            </>
          );
        }}
      </ResultsCard>
    </>
  );
};
