import React from "react";
import {
  ResultsCard,
  ReportError,
  Collapse,
  Column,
  Table,
  ReportTableStyled,
  GroupCircleRow,
  GroupPill,
  KeySection,
  HorizontalStackedBar,
  ReportChartFigure,
  ObjectiveStatus,
  useSketchProperties,
  VerticalSpacer,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  NullSketch,
  Metric,
  firstMatchingMetric,
  keyBy,
  toNullSketchArray,
  percentWithEdge,
  GroupMetricAgg,
  roundLower,
  squareMeterToKilometer,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  getKeys,
  Objective,
  getUserAttribute,
  ObjectiveAnswer,
  toPercentMetric,
  flattenByGroupAllClass,
} from "@seasketch/geoprocessing/client-core";
import {
  getMetricGroupObjectiveIds,
  getMinYesCountMap,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

import project from "../../project";
import { ReportProps } from "../util/ReportProp";

// Mapping groupIds to colors
const groupColorMap: Record<string, string> = {
  FULLY_PROTECTED: "#BEE4BE",
  HIGHLY_PROTECTED: "#FFE1A3",
};

// Mapping groupIds to display names
const groupDisplayMap: Record<string, string> = {
  FULLY_PROTECTED: "Fully Protected Area",
  HIGHLY_PROTECTED: "Highly Protected Area",
};

// Styling for 'Show by --' tables
export const SmallReportTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
  }
`;

/**
 * Top level SizeCard element
 * @param props GeoProp object to pass geography through, {geography:string}
 * @returns React.FunctionComponent
 */
export const SizeCard: React.FunctionComponent<ReportProps> = (props) => {
  const { t, i18n } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const curGeography = project.getGeographyById(props.geographyId, {
    fallbackGroup: "default-boundary",
  });
  const mg = project.getMetricGroup("boundaryAreaOverlap", t);
  const objectiveIds = getMetricGroupObjectiveIds(mg);
  const objectives = project.getMetricGroupObjectives(mg, t);

  return (
    <div style={{ breakInside: "avoid" }}>
      <ResultsCard
        title={t("Size")}
        functionName="boundaryAreaOverlap"
        extraParams={{ geographyIds: [curGeography.geographyId] }}
      >
        {(data: ReportResult) => {
          // Get overall area of sketch metric
          const areaMetric = firstMatchingMetric(
            data.metrics,
            (m) =>
              m.sketchId === data.sketch.properties.id && m.groupId === null
          );

          // Get precalcalulated total metrics from precalc.json
          const boundaryTotalMetrics = project.getPrecalcMetrics(
            mg,
            "area",
            curGeography.geographyId
          );

          // Grab overall size precalc metric
          const totalAreaMetric = firstMatchingMetric(
            boundaryTotalMetrics,
            (m) => m.groupId === null
          );

          // Format area metrics for key section display
          const areaDisplay = roundLower(
            squareMeterToKilometer(areaMetric.value)
          );
          const percDisplay = percentWithEdge(
            areaMetric.value / totalAreaMetric.value
          );
          const areaUnitDisplay = t("sq. km");

          return (
            <ReportError>
              <>
                {!areaMetric.value ? genWarning() : null}
                <KeySection>
                  {t("This plan is")}{" "}
                  <b>
                    {areaDisplay} {areaUnitDisplay}
                  </b>
                  {", "}
                  {t("which is")} <b>{percDisplay}</b> {t("of")}{" "}
                  {project.getGeographyById(curGeography.geographyId).display}{" "}
                  {t("nearshore waters")}.
                </KeySection>
                {isCollection
                  ? collectionReport(
                      data,
                      boundaryTotalMetrics,
                      curGeography.geographyId,
                      objectiveIds,
                      t,
                      props.printing
                    )
                  : sketchReport(data, curGeography.geographyId, t)}

                {!props.printing && (
                  <Collapse title={t("Learn More")}>
                    {genLearnMore(objectives, t)}
                  </Collapse>
                )}
              </>
            </ReportError>
          );
        }}
      </ResultsCard>
    </div>
  );
};

// styled-components are needed here to use the ::before pseudo selector
const ErrorIndicator = styled.div`
  display: inline-block;
  font-weight: bold;
  font-size: 18px;
  line-height: 1em;
  background-color: #ea4848;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  color: white;
  text-align: center;
  margin-right: 8px;
  ::before {
    position: relative;
    bottom: -1px;
    content: "!";
  }
`;

const genWarning = () => {
  return (
    <>
      <div role="alert">
        <ErrorIndicator />
        <b>
          This plan does not overlap with the selected nearshore planning area,
          please select a different planning area for useful report metrics.
        </b>
      </div>
      <VerticalSpacer />
    </>
  );
};

/**
 * Report protection level for single sketch
 * @param data ReportResult
 * @param geography string
 * @param t TFunction
 * @returns JSX.Element
 */
const sketchReport = (data: ReportResult, geography: string, t: any) => {
  const level = getUserAttribute(
    data.sketch.properties,
    "designation",
    "FULLY_PROTECTED"
  );
  return (
    <>
      <SketchObjectives groupId={level} geography={geography} t={t} />
    </>
  );
};

/**
 * Report protection level for sketch collection
 * @param data ReportResult
 * @param precalcMetrics Metric[] from precalc.json
 * @param geography string
 * @param t TFunction
 * @returns JSX.Element
 */
const collectionReport = (
  data: ReportResult,
  precalcMetrics: Metric[],
  geography: string,
  objectiveIds: string[],
  t: any,
  printing: boolean = false
) => {
  if (!isSketchCollection(data.sketch)) throw new Error("NullSketch");
  const sketches = toNullSketchArray(data.sketch);
  const sketchesById = keyBy(sketches, (sk) => sk.properties.id);

  // Filter down to metrics which have groupIds
  const levelMetrics = data.metrics.filter(
    (m) => m.groupId === "HIGHLY_PROTECTED" || m.groupId === "FULLY_PROTECTED"
  );

  // Group together by groupId
  const groupLevelAggs: GroupMetricAgg[] = flattenByGroupAllClass(
    data.sketch,
    levelMetrics,
    precalcMetrics
  );

  // Filter down grouped metrics to ones that count for each objective
  const totalsByObjective = objectiveIds.reduce<Record<string, number[]>>(
    (acc, objectiveId) => {
      // Protection levels which count for objective
      const yesAggs: GroupMetricAgg[] = groupLevelAggs.filter((levelAgg) => {
        const level = levelAgg.groupId;
        return (
          project.getObjectiveById(objectiveId).countsToward[level] ===
          OBJECTIVE_YES
        );
      });
      // Extract percent value from metric
      const yesValues = yesAggs.map((yesAgg) => yesAgg.percValue);
      return { ...acc, [objectiveId]: yesValues };
    },
    {}
  );

  // Child sketch table for 'Show By MPA'
  const childAreaMetrics = levelMetrics.filter(
    (m) => m.sketchId !== data.sketch.properties.id && m.groupId
  );
  const childAreaPercMetrics = toPercentMetric(
    childAreaMetrics,
    precalcMetrics
  );

  // Coloring and styling for horizontal bars
  const groupColors = Object.values(groupColorMap);
  const blockGroupNames = ["Full", "High"];
  const blockGroupStyles = groupColors.map((curBlue) => ({
    backgroundColor: curBlue,
  }));
  const valueFormatter = (value: number) => percentWithEdge(value / 100);

  return (
    <>
      {objectiveIds.map((objectiveId: string) => {
        const objective = project.getObjectiveById(objectiveId);

        // Get total percentage within sketch
        const percSum = totalsByObjective[objectiveId].reduce(
          (sum, value) => sum + value,
          0
        );

        // Checks if the objective is met
        const isMet =
          percSum >= objective.target ? OBJECTIVE_YES : OBJECTIVE_NO;

        // Create horizontal bar config
        const config = {
          rows: [totalsByObjective[objectiveId].map((value) => [value * 100])],
          rowConfigs: [
            {
              title: "",
            },
          ],
          target: objective.target * 100,
          max: 100,
        };

        const targetLabel = t("Target");

        return (
          <React.Fragment key={objectiveId}>
            <CollectionObjectiveStatus
              objective={objective}
              objectiveMet={isMet}
              geography={geography}
              t={t}
              renderMsg={collectionMsgs[objectiveId](
                objective,
                isMet,
                geography,
                t
              )}
            />
            <ReportChartFigure>
              <HorizontalStackedBar
                {...config}
                blockGroupNames={blockGroupNames}
                blockGroupStyles={blockGroupStyles}
                showLegend={true}
                valueFormatter={valueFormatter}
                targetValueFormatter={(value) =>
                  targetLabel + ` - ` + value + `%`
                }
              />
            </ReportChartFigure>
          </React.Fragment>
        );
      })}

      <Collapse
        title={t("Show by Protection Level")}
        collapsed={!printing}
        key={String(printing) + "level"}
      >
        {genGroupLevelTable(groupLevelAggs, geography, t)}
      </Collapse>

      <Collapse
        title={t("Show by MPA")}
        collapsed={!printing}
        key={String(printing) + "mpa"}
      >
        {genMpaSketchTable(sketchesById, childAreaPercMetrics, geography, t)}
      </Collapse>
    </>
  );
};

// SINGLE SKETCH TYPES AND ELEMENTS

/**
 * Properties for running SizeCard for single sketch
 * @param groupId level of protection, "FULLY_PROTECTED" or "HIGHLY_PROTECTED"
 * @param geography string representing geography
 */
interface SketchObjectivesProps {
  groupId: "FULLY_PROTECTED" | "HIGHLY_PROTECTED";
  geography: string;
  t: any;
}

/**
 * Presents objectives for single sketch
 * @param SketchObjectivesProps containing groupId and geographyId
 * @returns
 */
const SketchObjectives: React.FunctionComponent<SketchObjectivesProps> = ({
  groupId,
  geography,
  t,
}) => {
  return (
    <>
      {getKeys(sketchMsgs).map((objectiveId) => (
        <SketchObjectiveStatus
          key={objectiveId}
          groupId={groupId}
          objective={project.getObjectiveById(objectiveId)}
          geography={geography}
          renderMsg={() =>
            sketchMsgs[objectiveId](
              project.getObjectiveById(objectiveId),
              groupId,
              geography,
              t
            )
          }
        />
      ))}
    </>
  );
};

/**
 * Properties for getting objective status for single sketch
 * @param groupId level of protection, "FULLY_PROTECTED" or "HIGHLY_PROTECTED"
 * @param objective Objective
 * @param geography string representing geography
 * @param renderMsg function that takes (objective, groupId, geography)
 */
interface SketchObjectiveStatusProps {
  groupId: "FULLY_PROTECTED" | "HIGHLY_PROTECTED";
  objective: Objective;
  geography: string;
  renderMsg: Function;
}

/**
 * Presents objective status for single sketch
 * @param SketchObjectiveStatusProps containing groupId, objective, geographyId, renderMsg
 * @returns ObjectiveStatus JSX.Element
 */
const SketchObjectiveStatus: React.FunctionComponent<SketchObjectiveStatusProps> =
  ({ groupId, objective, geography, renderMsg }) => {
    return (
      <ObjectiveStatus
        key={objective.objectiveId}
        status={objective.countsToward[groupId]}
        msg={renderMsg(objective, groupId, geography)}
      />
    );
  };

// SKETCH COLLECTION TYPES AND ELEMENTS

/**
 * Properties for getting objective status for sketch collection
 * @param objective Objective
 * @param objectiveMet ObjectiveAnswer
 * @param geography string representing geography
 * @param renderMsg function that takes (objective, groupId, geography)
 */
interface CollectionObjectiveStatusProps {
  objective: Objective;
  objectiveMet: ObjectiveAnswer;
  geography: string;
  t: any;
  renderMsg: any;
}

/**
 * Presents objectives for single sketch
 * @param CollectionObjectiveStatusProps containing objective, objective and geographyId
 */
const CollectionObjectiveStatus: React.FunctionComponent<CollectionObjectiveStatusProps> =
  ({ objective, objectiveMet, geography, t }) => {
    const msg = collectionMsgs[objective.objectiveId](
      objective,
      objectiveMet,
      geography,
      t
    );

    return <ObjectiveStatus status={objectiveMet} msg={msg} />;
  };

/**
 * Renders messages beased on objective and if objective is met for single sketches
 */
const sketchMsgs: Record<string, any> = {
  nearshore_protected: (
    objective: Objective,
    level: "FULLY_PROTECTED" | "HIGHLY_PROTECTED",
    geographyId: string,
    t: any
  ) => {
    if (objective.countsToward[level] === OBJECTIVE_YES) {
      return (
        <>
          {t("This MPA counts towards protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters.")}
        </>
      );
    } else if (objective.countsToward[level] === OBJECTIVE_NO) {
      return (
        <>
          {t("This MPA does not count towards protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters.")}
        </>
      );
    }
  },
  nearshore_fully_protected: (
    objective: Objective,
    level: "FULLY_PROTECTED" | "HIGHLY_PROTECTED",
    geographyId: string,
    t: any
  ) => {
    if (objective.countsToward[level] === OBJECTIVE_YES) {
      return (
        <>
          {t("This MPA counts towards fully protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters as no-take.")}
        </>
      );
    } else if (objective.countsToward[level] === OBJECTIVE_NO) {
      return (
        <>
          {t("This MPA does not count towards fully protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters as no-take.")}
        </>
      );
    }
  },
};

/**
 * Renders messages beased on objective and if objective is met for sketch collections
 */
const collectionMsgs: Record<string, any> = {
  nearshore_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    geographyId: string,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters.")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters.")}
        </>
      );
    }
  },
  nearshore_fully_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    geographyId: string,
    t: any
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          {t("This plan meets the objective of fully protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters as no-take.")}
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          {t("This plan does not meet the objective of fully protecting")}{" "}
          <b>{percentWithEdge(objective.target)}</b> {t("of")}{" "}
          {project.getGeographyById(geographyId).display}{" "}
          {t("nearshore waters as no-take.")}
        </>
      );
    }
  },
};

/**
 * Generates Show By MPA sketch table
 * @param sketchesById Record<string, NullSketch>
 * @param regMetrics Metric[]
 * @param geographyId string
 * @returns
 */
const genMpaSketchTable = (
  sketchesById: Record<string, NullSketch>,
  regMetrics: Metric[],
  geographyId: string,
  t: any
) => {
  const columns: Column<Metric>[] = [
    {
      Header: t("MPA"),
      accessor: (row) => (
        <GroupPill groupColorMap={groupColorMap} group={row.groupId!}>
          {sketchesById[row.sketchId!].properties.name}
        </GroupPill>
      ),
    },
    {
      Header: "% " + project.getGeographyById(geographyId).display,
      accessor: (row) => percentWithEdge(row.value),
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={regMetrics.sort((a, b) => {
          return a.value > b.value ? 1 : -1;
        })}
      />
    </SmallReportTableStyled>
  );
};

const genGroupLevelTable = (
  levelAggs: GroupMetricAgg[],
  geographyId: string,
  t: any
) => {
  const groupDisplayMap: Record<string, string> = {
    FULLY_PROTECTED: t("Fully Protected Area(s)"),
    HIGHLY_PROTECTED: t("Highly Protected Area(s)"),
  };

  const columns: Column<GroupMetricAgg>[] = [
    {
      Header: t("This plan contains") + ":",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId}
          groupColorMap={groupColorMap}
          circleText={`${row.numSketches}`}
          rowText={
            <>
              <b>{groupDisplayMap[row.groupId]}</b>
            </>
          }
        />
      ),
    },
    {
      Header: "% " + project.getGeographyById(geographyId).display,
      accessor: (row) => {
        return (
          <GroupPill groupColorMap={groupColorMap} group={row.groupId}>
            {percentWithEdge(row.percValue as number)}
          </GroupPill>
        );
      },
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={levelAggs.sort((a, b) => a.groupId.localeCompare(b.groupId))}
      />
    </SmallReportTableStyled>
  );
};

/**
 * Generates Learn More for Size Card
 * @param objectives Objective[]
 * @returns JSX.Element
 */
const genLearnMore = (objectives: Objective[], t: any) => {
  const objectiveMap = keyBy(objectives, (obj) => obj.objectiveId);
  const minYesCounts = getMinYesCountMap(objectives);
  return (
    <>
      <p>
        <Trans i18nKey="Protection Card - Learn more">
          An MPA counts toward an objective if it meets the minimum level of
          protection for that objective.
        </Trans>
      </p>
      <table>
        <thead>
          <tr>
            <th>{t("Objective")}</th>
            <th>{t("Minimum MPA Classification Required")}</th>
          </tr>
        </thead>
        <tbody>
          {getKeys(objectiveMap).map((objectiveId, index) => {
            return (
              <tr key={index}>
                <td>{objectiveMap[objectiveId].shortDesc}</td>
                <td>{groupDisplayMap[minYesCounts[objectiveId]]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        <Trans i18nKey="Size Card - Learn more">
          Overlap is only counted once. If MPAs of different protection levels
          overlap, only the highest protection level is counted.
        </Trans>
      </p>
    </>
  );
};
