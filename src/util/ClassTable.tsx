import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { CheckCircleFill } from "@styled-icons/bootstrap";
import {
  ClassTableColumnConfig,
  ClassTableProps,
  ClassTableStyled,
  Column,
  HorizontalStackedBar,
  LayerToggle,
  Table,
} from "@seasketch/geoprocessing/client-ui";
import {
  keyBy,
  nestMetrics,
  valueFormatter,
  percentWithEdge,
} from "@seasketch/geoprocessing/client-core";
import {
  getMetricGroupObjectiveId,
  getObjectiveById,
} from "@seasketch/geoprocessing";

/**
 * Table displaying class metrics, one class per table row.  Having more than one metric per class may yield unexpected results
 * ----- DIFFERENCES FROM ClassTable IN GP ------
 * Returns 0 when faced with a 'missing' metrics instead of erroring, which occurs in OUSDemographics (when 0 people overlap)
 * This same edit was made in the Maldives offshore reports to account for OUS Demographics
 */
export const ClassTable: React.FunctionComponent<ClassTableProps> = ({
  rows,
  columnConfig,
  metricGroup,
  objective,
}) => {
  const { t } = useTranslation();
  const classesByName = keyBy(
    metricGroup.classes,
    (curClass) => curClass.classId
  );

  // group metrics by class ID, then metric ID, for easy lookup
  const metricsByClassByMetric = nestMetrics(rows, ["classId", "metricId"]);

  // Use sketch ID for each table row, use index to lookup into nested metrics
  const tableRows = Object.keys(metricsByClassByMetric).map((classId) => ({
    classId,
  }));

  type ClassTableColumn = Column<{ classId: string }>;

  const genColumns = (
    colConfigs: ClassTableColumnConfig[]
  ): ClassTableColumn[] => {
    const defaultWidth = 100 / colConfigs.length;

    const defaultClassLabel = t("Class");
    const defaultMapLabel = t("Map");
    const defaultTargetLabel = t("Target");
    const defaultGoalLabel = t("Goal");
    const defaultValueLabel = t("Value");

    // Transform column configs into Columns
    const colz: ClassTableColumn[] = colConfigs.map((colConfig) => {
      const style = {
        width: `${colConfig.width || defaultWidth}%`,
        ...(colConfig.colStyle ? colConfig.colStyle : {}),
      };
      if (colConfig.type === "class") {
        return {
          Header: colConfig.columnLabel || defaultClassLabel,
          accessor: (row) => {
            /* i18next-extract-disable-next-line */
            const transString = t(
              classesByName[row.classId || "missing"]?.display
            );
            return transString || "missing";
          },
          style,
        };
      } else if (colConfig.type === "metricValue") {
        return {
          Header: colConfig.columnLabel || defaultValueLabel,
          accessor: (row) => {
            if (!colConfig.metricId)
              throw new Error("Missing metricId in column config");
            const value = (() => {
              if (
                metricsByClassByMetric[row.classId] &&
                metricsByClassByMetric[row.classId][colConfig.metricId]
              ) {
                return metricsByClassByMetric[row.classId][
                  colConfig.metricId
                ][0].value;
              } else {
                return 0;
              }
            })();
            return `${
              colConfig.valueFormatter
                ? valueFormatter(value, colConfig.valueFormatter)
                : value
            } ${colConfig.valueLabel ? ` ${colConfig.valueLabel}` : ""}`;
          },
          style,
        };
      } else if (colConfig.type === "metricChart") {
        return {
          Header: colConfig.columnLabel || " ",
          style: { textAlign: "center", ...style },
          accessor: (row, rowIndex) => {
            if (!colConfig.metricId)
              throw new Error("Missing metricId in column config");
            const value = (() => {
              if (
                metricsByClassByMetric[row.classId] &&
                metricsByClassByMetric[row.classId][colConfig.metricId]
              ) {
                return metricsByClassByMetric[row.classId][
                  colConfig.metricId
                ][0].value;
              } else {
                return 0;
              }
            })();
            const target = (() => {
              if (!objective) return 0;
              if (Array.isArray(objective)) {
                // Multi-objective - need to find by class ID
                const objectiveId = getMetricGroupObjectiveId(
                  metricGroup,
                  row.classId
                );
                const theObj = Array.isArray(objective)
                  ? getObjectiveById(objectiveId, objective)
                  : objective;

                if (colConfig.valueFormatter === "percent") {
                  return theObj.target * 100;
                } else {
                  return theObj.target;
                }
              } else {
                // single objective, just grab the target
                if (colConfig.valueFormatter === "percent") {
                  return objective.target * 100;
                } else {
                  return objective.target;
                }
              }
            })();

            const chartProps = {
              ...(colConfig.chartOptions ? colConfig.chartOptions : {}),
              rows: [
                [
                  [
                    colConfig.valueFormatter === "percent"
                      ? value * 100
                      : value,
                  ],
                ],
              ],
              rowConfigs: [
                {
                  title: (value: number) => (
                    <>
                      {target && value >= target ? (
                        <CheckCircleFill
                          size={14}
                          style={{ color: "#78c679", paddingRight: 5 }}
                        />
                      ) : (
                        <></>
                      )}
                      {percentWithEdge(value / 100)}
                    </>
                  ),
                },
              ],
              max: 100,
            };

            let targetValueFormatter:
              | ((value: number) => string | JSX.Element)
              | undefined;
            if (typeof colConfig.targetValueFormatter === "function") {
              targetValueFormatter = colConfig.targetValueFormatter(
                target,
                rowIndex,
                tableRows.length
              );
            } else {
              targetValueFormatter = (targetValue) =>
                rowIndex === tableRows.length - 1
                  ? `${defaultTargetLabel} - ${valueFormatter(
                      targetValue / 100,
                      "percent0dig"
                    )}`
                  : "";
            }

            return (
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <HorizontalStackedBar
                    blockGroupNames={["foo"]}
                    blockGroupStyles={[{ backgroundColor: "#ACD0DE" }]}
                    showTitle={true}
                    showLegend={false}
                    showTargetLabel={true}
                    targetLabelPosition="bottom"
                    showTotalLabel={false}
                    barHeight={12}
                    target={target || undefined}
                    targetValueFormatter={targetValueFormatter}
                    {...chartProps}
                  />
                </div>
              </div>
            );
          },
        };
      } else if (colConfig.type === "metricGoal") {
        return {
          Header: colConfig.columnLabel || defaultGoalLabel,
          style,
          accessor: (row) => {
            const objectiveId = getMetricGroupObjectiveId(
              metricGroup,
              row.classId
            );
            const theObj = Array.isArray(objective)
              ? getObjectiveById(objectiveId, objective)
              : objective;
            if (!theObj)
              throw new Error(
                `Missing objective for objectiveId ${objectiveId}`
              );

            return colConfig.valueFormatter
              ? valueFormatter(theObj.target, colConfig.valueFormatter)
              : `${theObj.target}${
                  colConfig.valueLabel ? ` ${colConfig.valueLabel}` : ""
                }`;
          },
        };
      } else if (colConfig.type === "layerToggle") {
        return {
          Header: colConfig.columnLabel || defaultMapLabel,
          style: { textAlign: "center", ...style },
          accessor: (row, index) => {
            const isSimpleGroup = metricGroup.layerId ? false : true;
            const layerId =
              metricGroup.layerId || classesByName[row.classId!].layerId;
            if (isSimpleGroup && layerId) {
              return (
                <LayerToggle
                  simple
                  size="small"
                  layerId={layerId}
                  style={{
                    marginTop: 0,
                    justifyContent: "center",
                  }}
                />
              );
            } else if (!isSimpleGroup && layerId && index === 0) {
              return (
                <LayerToggle
                  simple
                  size="small"
                  layerId={layerId}
                  style={{ marginTop: 0, justifyContent: "center" }}
                />
              );
            } else {
              return <></>;
            }
          },
        };
      } else {
        throw new Error(
          `Unexpected ClassTableColumnConfig type ${colConfig.type}`
        );
      }
    });
    return colz;
  };

  const columns = genColumns(columnConfig);

  return (
    <ClassTableStyled>
      <Table className="styled" columns={columns} data={tableRows} />
    </ClassTableStyled>
  );
};
