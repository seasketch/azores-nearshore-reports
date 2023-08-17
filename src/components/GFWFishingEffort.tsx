import React from "react";
import {
  Collapse,
  ResultsCard,
  SketchClassTable,
  ClassTable,
  ClassTableColumnConfig,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  ReportResultBase,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  NullSketch,
  NullSketchCollection,
  Metric,
  MetricGroup,
} from "@seasketch/geoprocessing/client-core";
import cloneDeep from "lodash/cloneDeep";
import { useTranslation } from "react-i18next";
import project from "../../project";
import {
  getPrecalcMetrics,
  toPercentMetric,
} from "../../data/bin/getPrecalcMetrics";
import { GeoProp } from "../types";

export const GFWFishingEffort: React.FunctionComponent<GeoProp> = (props) => {
  const [{ isCollection }] = useSketchProperties();
  const { t } = useTranslation();
  const metricGroup = project.getMetricGroup("gfwValueOverlap", t);
  const precalcTotals: Metric[] = getPrecalcMetrics(
    metricGroup,
    "sum",
    props.geographyId
  );
  return (
    <>
      <ResultsCard
        title="Fishing Effort - 2019-2022"
        functionName="gfwValueOverlap"
      >
        {(data: ReportResult) => {
          const percMetricIdName = `${metricGroup.metricId}Perc`;

          const metricsValueAndPerc = [
            ...data.metrics,
            ...toPercentMetric(data.metrics, precalcTotals, percMetricIdName),
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

          const colWidths = {
            classColWidth: "40%",
            percColWidth: "40%",
            showMapWidth: "20%",
            goalWidth: "0%",
          };

          const colConfigs: ClassTableColumnConfig[] = [
            {
              columnLabel: "All Fishing",
              type: "class",
              width: 31,
            },
            {
              type: "metricValue",
              metricId: metricGroup.metricId,
              valueFormatter: "integer",
              valueLabel: "hours",
              width: 20,
              colStyle: { textAlign: "right" },
              columnLabel: "Fishing Effort",
            },
            {
              type: "metricValue",
              metricId: percMetricIdName,
              valueFormatter: "percent",
              columnLabel: "Within Plan",
              width: 15,
              colStyle: { textAlign: "right" },
            },
            {
              type: "metricChart",
              metricId: percMetricIdName,
              valueFormatter: "percent",
              chartOptions: {
                showTitle: false,
              },
              width: 20,
            },
            {
              type: "layerToggle",
              width: 14,
            },
          ];

          const gearTypeColConfigs = cloneDeep(colConfigs);
          gearTypeColConfigs[0].columnLabel = "By Gear Type";

          const countryColConfigs = cloneDeep(colConfigs);
          countryColConfigs[0].columnLabel = "By Country";

          return (
            <>
              <p>
                This report summarizes the proportion of fishing effort from
                2019-2022 that is within this plan, as reported by Global
                Fishing Watch. The higher the percentage, the greater the
                potential impact to the fishery if access or activities are
                restricted.
              </p>

              <Collapse title="Learn more">
                <p>
                  🎯 Planning Objective: there is no specific objective/target
                  for limiting the potential impact to fishing activities.
                </p>
                <p>
                  🗺️ Source Data: <b>Apparent fishing effort</b> is measured
                  using transmissions (or "pings") broadcast by fishing vessels
                  using the automatic identification system (AIS) vessel
                  tracking system.
                </p>
                <p>
                  Machine learning models are then used to classify fishing
                  vessels and predict when they are fishing based on their
                  movement patterns and changes in speed.
                </p>
                <p>
                  Apparent fishing effort can then be calculated for any area by
                  summarizing the fishing hours for all fishing vessels in that
                  area.
                </p>
                <p>
                  📈 Report: Percentages are calculated by summing the total
                  amount of fishing effort (in hours) within the MPAs in this
                  plan, and dividing it by the total amount of fishing effort
                  (in hours) across the overall planning area. If the plan
                  includes multiple areas that overlap, the overlap is only
                  counted once.
                </p>
                <p>
                  There are a number of caveats and limitations to this data.
                  For further information:{" "}
                  <a
                    target="_blank"
                    href={`"https://globalfishingwatch.org/dataset-and-code-fishing-effort"`}
                  >
                    Global Fishing Watch - Apparent Fishing Effort
                  </a>
                </p>
              </Collapse>

              <ClassTable
                rows={parentMetricsAll}
                metricGroup={metricGroupAll}
                columnConfig={colConfigs}
              />
              {isCollection && (
                <Collapse title="Show by MPA">
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
                <Collapse title="Show by MPA">
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
                <Collapse title="Show by MPA">
                  {genSketchTable(
                    data.sketch,
                    metricsByCountry,
                    metricGroupByCountry
                  )}
                </Collapse>
              )}
            </>
          );
        }}
      </ResultsCard>
    </>
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
