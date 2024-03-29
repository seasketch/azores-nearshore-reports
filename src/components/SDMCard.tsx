import React from "react";
import {
  Collapse,
  ResultsCard,
  useSketchProperties,
  LayerToggle,
  ToolbarCard,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  valueFormatter,
  sortMetrics,
  Metric,
  MetricGroup,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import {
  ClassTable,
  SketchClassTable,
} from "@seasketch/geoprocessing/client-ui";
import project from "../../project";
import { Trans, useTranslation } from "react-i18next";
import { ReportProps } from "../util/ReportProp";
import { genSketchTable } from "../util/genSketchTable";

export const SDMCard: React.FunctionComponent<ReportProps> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const metricGroup = project.getMetricGroup("sdmValueOverlap", t);
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  const precalcMetrics: Metric[] = project.getPrecalcMetrics(
    metricGroup,
    "sum",
    curGeography.geographyId
  );
  const mapLabel = t("Map");
  const breedingBirdsLabel = t("Breeding Birds");
  const turtlesLabel = t("Turtles");
  const percAreaWithin = t("% Area Within Plan");
  return (
    <div style={{ breakInside: "avoid" }}>
      <ResultsCard
        title={t("Valuable Species Habitat")}
        functionName="sdmValueOverlap"
        extraParams={{ geographyIds: [curGeography.geographyId] }}
        useChildCard
      >
        {(data: ReportResult) => {
          // Single sketch or collection top-level
          const topLevelMetrics = metricsWithSketchId(
            toPercentMetric(
              data.metrics.filter((m) => m.metricId === metricGroup.metricId),
              precalcMetrics
            ),
            [data.sketch.properties.id]
          );

          const sortedMetrics = sortMetrics(topLevelMetrics);

          // grouping metrics by group prefix
          const groupedMetrics = sortedMetrics.reduce<Record<string, any>>(
            (groups, metric) => {
              // get group id from classId prefix (i.e. "birds", "turtles")
              const group: string | undefined = metric.classId?.substring(
                0,
                metric.classId?.indexOf("_")
              );
              // if there's no group prefix, make a note and skip it
              if (!group) {
                console.log("Expected group id");
                return groups;
              }

              // adds metric to the group's metric array
              groups[group] = [...(groups[group] || []), metric];
              return groups;
            },
            {}
          );

          return (
            <ToolbarCard
              title={t("Key Species")}
              items={
                <LayerToggle
                  label={mapLabel}
                  layerId={metricGroup.layerId}
                  simple
                />
              }
            >
              <p>
                <Trans i18nKey="SDM Card 1">
                  This report summarizes the key species habitat within the
                </Trans>{" "}
                {curGeography.display}{" "}
                <Trans i18nKey="SDM Card 2">
                  nearshore planning area protected by this plan, based on
                  species distribution models. The higher the percentage, the
                  greater the protection of areas used by key species.
                </Trans>
              </p>

              <ClassTable
                rows={groupedMetrics["birds"]}
                metricGroup={metricGroup}
                objective={undefined}
                columnConfig={[
                  {
                    columnLabel: breedingBirdsLabel,
                    type: "class",
                    width: 35,
                  },
                  {
                    columnLabel: percAreaWithin,
                    type: "metricChart",
                    metricId: metricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                      showTargetLabel: true,
                      targetLabelPosition: "bottom",
                      targetLabelStyle: "tight",
                      barHeight: 11,
                    },
                    width: 50,
                    targetValueFormatter: (
                      value: number,
                      row: number,
                      numRows: number
                    ) => {
                      if (row === 0) {
                        return (value: number) =>
                          `${valueFormatter(
                            value / 100,
                            "percent0dig"
                          )} Target`;
                      } else {
                        return (value: number) =>
                          `${valueFormatter(value / 100, "percent0dig")}`;
                      }
                    },
                  },
                  {
                    type: "layerToggle",
                    width: 15,
                    columnLabel: mapLabel,
                  },
                ]}
              />

              <ClassTable
                rows={groupedMetrics["turtles"]}
                metricGroup={metricGroup}
                objective={undefined}
                columnConfig={[
                  {
                    columnLabel: turtlesLabel,
                    type: "class",
                    width: 35,
                  },
                  {
                    columnLabel: percAreaWithin,
                    type: "metricChart",
                    metricId: metricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                      showTargetLabel: true,
                      targetLabelPosition: "bottom",
                      targetLabelStyle: "tight",
                      barHeight: 11,
                    },
                    width: 50,
                    targetValueFormatter: (
                      value: number,
                      row: number,
                      numRows: number
                    ) => {
                      if (row === 0) {
                        return (value: number) =>
                          `${valueFormatter(
                            value / 100,
                            "percent0dig"
                          )} Target`;
                      } else {
                        return (value: number) =>
                          `${valueFormatter(value / 100, "percent0dig")}`;
                      }
                    },
                  },
                  {
                    type: "layerToggle",
                    width: 15,
                    columnLabel: mapLabel,
                  },
                ]}
              />

              {isCollection && (
                <Collapse
                  title={t("Show by MPA")}
                  collapsed={!props.printing}
                  key={String(props.printing) + "mpa"}
                >
                  {genSketchTable(
                    data,
                    precalcMetrics,
                    metricGroup,
                    props.printing
                  )}
                </Collapse>
              )}

              {!props.printing && (
                <Collapse title={t("Learn more")}>
                  <Trans i18nKey="SDM Card - learn more">
                    <p>
                      ℹ️ Maintaining populations of key species requires
                      protecting habitats which support those species. This
                      report can be used to inform which key species' habitats
                      would be protected by this plan. The higher the
                      percentage, the greater the protection of these species.
                    </p>
                    <p>
                      🎯 Planning Objective: there is no specific
                      objective/target for key species habitat.
                    </p>
                    <p>
                      🗺️ Source Data: The species distribution models (SDMs)
                      used in this report are from the Araújo Lab. SDMs model
                      probability of presence of individual species in a given
                      area. While these SDMs are based partly on collected
                      observational data, they are models and thus have baked-in
                      uncertainty.
                    </p>
                    <p>
                      📈 Report: Percentages are calculated by taking the total
                      area of the species' distribution within the MPAs in this
                      plan, and dividing it by the total area of the species'
                      distribution in the nearshore. If the plan includes
                      multiple areas that overlap, the overlap is only counted
                      once.
                    </p>
                  </Trans>
                </Collapse>
              )}
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </div>
  );
};
