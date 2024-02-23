import React from "react";
import {
  Collapse,
  ResultsCard,
  ClassTableColumnConfig,
  useSketchProperties,
  ClassTable,
  SketchClassTable,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  NullSketch,
  NullSketchCollection,
  Metric,
  MetricGroup,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import cloneDeep from "lodash/cloneDeep";
import { Trans, useTranslation } from "react-i18next";
import project from "../../project";
import { ReportProps } from "../util/ReportProp";

export const GFWFishingEffort: React.FunctionComponent<ReportProps> = (
  props
) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const metricGroup = project.getMetricGroup("gfwValueOverlap", t);
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  const precalcTotals: Metric[] = project.getPrecalcMetrics(
    metricGroup,
    "sum",
    curGeography.geographyId
  );

  const allFishingLabel = t("All Fishing");
  const byGearTypeLabel = t("By Gear Type");
  const byCountryLabel = t("By Country");
  const mapLabel = t("Map");
  const fishingEffortLabel = t("Fishing Effort");
  const percWithinLabel = t("% Within Plan");
  const hoursLabel = t("hours");

  return (
    <div style={{ breakInside: "avoid" }}>
      <ResultsCard
        title={t("Fishing Effort - 2019-2022")}
        functionName="gfwValueOverlap"
        extraParams={{ geographyIds: [curGeography.geographyId] }}
      >
        {(data: ReportResult) => {
          const percMetricIdName = `${metricGroup.metricId}Perc`;

          const metricsValueAndPerc = [
            ...data.metrics,
            ...toPercentMetric(data.metrics, precalcTotals, {
              metricIdOverride: percMetricIdName,
            }),
          ];

          const metricsAll = metricsValueAndPerc.filter((m) =>
            m.classId!.includes("all")
          );
          const metricGroupAll = {
            ...metricGroup,
            classes: metricGroup.classes.filter((cls) =>
              cls.classId.includes("all-fishing")
            ),
          };
          const parentMetricsAll = metricsWithSketchId(metricsAll, [
            data.sketch.properties.id,
          ]);

          const metricsByGearType = metricsValueAndPerc.filter((m) =>
            m.classId!.includes("gear_type")
          );
          const metricGroupByGearType = {
            ...metricGroup,
            classes: metricGroup.classes.filter((cls) =>
              cls.classId.includes("gear_type")
            ),
          };
          const parentMetricsByGearType = metricsWithSketchId(
            metricsByGearType,
            [data.sketch.properties.id]
          );

          const metricsByCountry = metricsValueAndPerc.filter((m) =>
            m.classId!.includes("country")
          );
          const metricGroupByCountry = {
            ...metricGroup,
            classes: metricGroup.classes.filter((cls) =>
              cls.classId.includes("country")
            ),
          };
          const parentMetricsByCountry = metricsWithSketchId(metricsByCountry, [
            data.sketch.properties.id,
          ]);

          const colConfigs: ClassTableColumnConfig[] = [
            {
              columnLabel: allFishingLabel,
              type: "class",
              width: 20,
            },
            {
              type: "metricValue",
              metricId: metricGroup.metricId,
              valueFormatter: "integer",
              valueLabel: hoursLabel,
              width: 20,
              columnLabel: fishingEffortLabel,
            },
            {
              columnLabel: percWithinLabel,
              type: "metricChart",
              metricId: percMetricIdName,
              valueFormatter: "percent",
              chartOptions: {
                showTitle: true,
              },
              width: 35,
            },
            {
              type: "layerToggle",
              width: 15,
              columnLabel: mapLabel,
            },
          ];

          const gearTypeColConfigs = cloneDeep(colConfigs);
          gearTypeColConfigs[0].columnLabel = byGearTypeLabel;

          const countryColConfigs = cloneDeep(colConfigs);
          countryColConfigs[0].columnLabel = byCountryLabel;

          return (
            <>
              <p>
                <Trans i18nKey="GFW Card 1">
                  This report summarizes the proportion of 2019-2022 fishing
                  effort within the
                </Trans>{" "}
                {curGeography.display}{" "}
                <Trans i18nKey="GFW Card 2">
                  nearshore planning area that that overlaps with this plan, as
                  reported by Global Fishing Watch. The higher the percentage,
                  the greater the potential impact to the fishery if access or
                  activities are restricted.
                </Trans>
              </p>

              <ClassTable
                rows={parentMetricsAll}
                metricGroup={metricGroupAll}
                columnConfig={colConfigs}
              />
              {isCollection && (
                <Collapse
                  title={t("Show by MPA")}
                  collapsed={!props.printing}
                  key={String(props.printing) + "mpa1"}
                >
                  {genSketchTable(data.sketch, metricsAll, metricGroupAll)}
                </Collapse>
              )}
              <br />

              <ClassTable
                rows={parentMetricsByGearType}
                metricGroup={metricGroupByGearType}
                columnConfig={gearTypeColConfigs}
              />
              {isCollection && (
                <Collapse
                  title={t("Show by MPA")}
                  collapsed={!props.printing}
                  key={String(props.printing) + "mpa2"}
                >
                  {genSketchTable(
                    data.sketch,
                    metricsByGearType,
                    metricGroupByGearType
                  )}
                </Collapse>
              )}
              <br />

              <ClassTable
                rows={parentMetricsByCountry}
                metricGroup={metricGroupByCountry}
                columnConfig={countryColConfigs}
              />
              {isCollection && (
                <Collapse
                  title={t("Show by MPA")}
                  collapsed={!props.printing}
                  key={String(props.printing) + "mpa3"}
                >
                  {genSketchTable(
                    data.sketch,
                    metricsByCountry,
                    metricGroupByCountry
                  )}
                </Collapse>
              )}

              {!props.printing && (
                <Collapse title={t("Learn more")}>
                  <Trans i18nKey="GFW Card - learn more">
                    <p>
                      🎯 Planning Objective: there is no specific
                      objective/target for limiting the potential impact to
                      fishing activities.
                    </p>
                    <p>
                      🗺️ Source Data: <b>Apparent fishing effort</b> is measured
                      using transmissions (or "pings") broadcast by fishing
                      vessels using the automatic identification system (AIS)
                      vessel tracking system.
                    </p>
                    <p>
                      Machine learning models are then used to classify fishing
                      vessels and predict when they are fishing based on their
                      movement patterns and changes in speed.
                    </p>
                    <p>
                      Apparent fishing effort can then be calculated for any
                      area by summarizing the fishing hours for all fishing
                      vessels in that area.
                    </p>
                    <p>
                      📈 Report: Percentages are calculated by summing the total
                      amount of fishing effort (in hours) within the MPAs in
                      this plan, and dividing it by the total amount of fishing
                      effort (in hours) across the selected nearshore planning
                      area. If the plan includes multiple areas that overlap,
                      the overlap is only counted once.
                    </p>
                    <p>
                      Some data layers which were present in offshore planning
                      have been removed because they don't overlap with the
                      nearshore. These layers are: Purse Seines, Other Purse
                      Seines, Set Gillnet, Trawlers, Trollers, and Russia.
                    </p>
                    <p>
                      There are a number of caveats and limitations to this
                      data. For further information:{" "}
                      <a
                        target="_blank"
                        href={`"https://globalfishingwatch.org/dataset-and-code-fishing-effort"`}
                      >
                        Global Fishing Watch - Apparent Fishing Effort
                      </a>
                    </p>
                  </Trans>
                </Collapse>
              )}
            </>
          );
        }}
      </ResultsCard>
    </div>
  );
};

const genSketchTable = (
  sketch: NullSketch | NullSketchCollection,
  metrics: Metric[],
  metricGroup: MetricGroup
) => {
  const childSketches = toNullSketchArray(sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);

  const childSketchMetrics = metricsWithSketchId(metrics, childSketchIds);
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );

  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};
