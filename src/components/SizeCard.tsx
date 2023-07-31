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
  capitalize,
  roundLower,
  squareMeterToKilometer,
  toPercentMetric,
  OBJECTIVE_NO,
  OBJECTIVE_YES,
  getKeys,
  Objective,
  getUserAttribute,
  ObjectiveAnswer,
} from "@seasketch/geoprocessing/client-core";
import {
  getMetricGroupObjectiveIds,
  getMinYesCountMap,
  getObjectiveById,
  isSketchCollection,
} from "@seasketch/geoprocessing";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  getGeographyDisplay,
  getPrecalcMetrics,
} from "../../data/bin/getPrecalcMetrics";
import { GeoProp } from "../clients/MpaTabReport";

import project from "../../project";
import { flattenByGroupAllClass } from "../util/flattenByGroupAllClass";

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
export const SizeCard: React.FunctionComponent<GeoProp> = (props) => {
  const { t, i18n } = useTranslation();
  const [{ isCollection }] = useSketchProperties();
  const mg = project.getMetricGroup("boundaryAreaOverlap", t);
  const objectiveIds = getMetricGroupObjectiveIds(mg);
  const objectives = objectiveIds.map((o) => project.getObjectiveById(o));

  return (
    <ResultsCard title={t("Size")} functionName="boundaryAreaOverlap">
      {(data: ReportResult) => {
        // Get overall area of sketch metric
        const areaMetric = firstMatchingMetric(
          data.metrics,
          (m) => m.sketchId === data.sketch.properties.id && m.groupId === null
        );

        // Get precalcalulated total metrics from precalc.json
        const boundaryTotalMetrics = getPrecalcMetrics(
          mg,
          "area",
          props.geography
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
        const areaUnitDisplay = "sq. km";

        return (
          <ReportError>
            <>
              <KeySection>
                This plan is{" "}
                <b>
                  {areaDisplay} {areaUnitDisplay}
                </b>
                , which is <b>{percDisplay}</b> of{" "}
                {getGeographyDisplay(props.geography)} waters.
              </KeySection>
              {isCollection
                ? collectionReport(
                    data,
                    boundaryTotalMetrics,
                    props.geography,
                    objectiveIds
                  )
                : sketchReport(data, props.geography)}

              <Collapse title={t("Learn More")}>
                {genLearnMore(objectives)}
              </Collapse>
            </>
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

/**
 * Report protection level for single sketch
 * @param data ReportResult
 * @param geography string
 * @returns JSX.Element
 */
const sketchReport = (data: ReportResult, geography: string) => {
  const level = getUserAttribute(
    data.sketch.properties,
    "designation",
    "FULLY_PROTECTED"
  );

  return (
    <>
      <SketchObjectives groupId={level} geography={geography} />
    </>
  );
};

/**
 * Report protection level for sketch collection
 * @param data ReportResult
 * @param precalcMetrics Metric[] from precalc.json
 * @param geography string
 * @returns JSX.Element
 */
const collectionReport = (
  data: ReportResult,
  precalcMetrics: Metric[],
  geography: string,
  objectiveIds: string[]
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

        return (
          <React.Fragment key={objectiveId}>
            <CollectionObjectiveStatus
              objective={objective}
              objectiveMet={isMet}
              geography={geography}
              renderMsg={collectionMsgs[objectiveId](
                objective,
                isMet,
                geography
              )}
            />
            <ReportChartFigure>
              <HorizontalStackedBar
                {...config}
                blockGroupNames={blockGroupNames}
                blockGroupStyles={blockGroupStyles}
                showLegend={true}
                valueFormatter={valueFormatter}
                targetValueFormatter={(value) => `Target - ` + value + `%`}
              />
            </ReportChartFigure>
          </React.Fragment>
        );
      })}

      <Collapse title="Show by Protection Level">
        {genGroupLevelTable(groupLevelAggs, geography)}
      </Collapse>

      <Collapse title="Show by MPA">
        {genMpaSketchTable(sketchesById, childAreaPercMetrics, geography)}
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
}

/**
 * Presents objectives for single sketch
 * @param SketchObjectivesProps containing groupId and geographyId
 * @returns
 */
const SketchObjectives: React.FunctionComponent<SketchObjectivesProps> = ({
  groupId,
  geography,
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
              geography
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
  renderMsg: any;
}

/**
 * Presents objectives for single sketch
 * @param CollectionObjectiveStatusProps containing objective, objective and geographyId
 */
const CollectionObjectiveStatus: React.FunctionComponent<CollectionObjectiveStatusProps> =
  ({ objective, objectiveMet, geography }) => {
    const msg = collectionMsgs[objective.objectiveId](
      objective,
      objectiveMet,
      geography
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
    geography: string
  ) => {
    if (objective.countsToward[level] === OBJECTIVE_YES) {
      return (
        <>
          This MPA counts towards protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    } else if (objective.countsToward[level] === OBJECTIVE_NO) {
      return (
        <>
          This MPA <b>does not</b> count towards protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    } else {
      return (
        <>
          This MPA <b>may</b> count towards protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    }
  },
  nearshore_fully_protected: (
    objective: Objective,
    level: "FULLY_PROTECTED" | "HIGHLY_PROTECTED",
    geography: string
  ) => {
    if (objective.countsToward[level] === OBJECTIVE_YES) {
      return (
        <>
          This MPA counts towards fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
        </>
      );
    } else if (objective.countsToward[level] === OBJECTIVE_NO) {
      return (
        <>
          This MPA <b>does not</b> count towards fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
        </>
      );
    } else {
      return (
        <>
          This MPA <b>may</b> count towards fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
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
    geography: string
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          This plan meets the objective of protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          This plan <b>does not</b> meet the objective of protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    } else {
      return (
        <>
          This plan <b>may</b> meet the objective of protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters.
        </>
      );
    }
  },
  nearshore_fully_protected: (
    objective: Objective,
    objectiveMet: ObjectiveAnswer,
    geography: string
  ) => {
    if (objectiveMet === OBJECTIVE_YES) {
      return (
        <>
          This plan meets the objective of fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
        </>
      );
    } else if (objectiveMet === OBJECTIVE_NO) {
      return (
        <>
          This plan <b>does not</b> meet the objective of fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
        </>
      );
    } else {
      return (
        <>
          This plan <b>may</b> meet the objective of fully protecting{" "}
          <b>{percentWithEdge(objective.target)}</b> of{" "}
          {getGeographyDisplay(geography)} waters as no-take.
        </>
      );
    }
  },
};

/**
 * Generates Show By MPA sketch table
 * @param sketchesById Record<string, NullSketch>
 * @param regMetrics Metric[]
 * @param geography string
 * @returns
 */
const genMpaSketchTable = (
  sketchesById: Record<string, NullSketch>,
  regMetrics: Metric[],
  geography: string
) => {
  const columns: Column<Metric>[] = [
    {
      Header: "MPA",
      accessor: (row) => sketchesById[row.sketchId!].properties.name,
    },
    {
      Header: "% " + getGeographyDisplay(geography),
      accessor: (row) => (
        <GroupPill groupColorMap={groupColorMap} group={row.groupId!}>
          {percentWithEdge(row.value)}
        </GroupPill>
      ),
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

const genGroupLevelTable = (levelAggs: GroupMetricAgg[], geography: string) => {
  const columns: Column<GroupMetricAgg>[] = [
    {
      Header: "This plan contains:",
      accessor: (row) => (
        <GroupCircleRow
          group={row.groupId}
          groupColorMap={groupColorMap}
          circleText={`${row.numSketches}`}
          rowText={
            <>
              <b>
                {capitalize(groupDisplayMap[row.groupId])}
                {row.numSketches === 1 ? "" : "s"}
              </b>
            </>
          }
        />
      ),
    },
    {
      Header: "% " + getGeographyDisplay(geography),
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
const genLearnMore = (objectives: Objective[]) => {
  const objectiveMap = keyBy(objectives, (obj) => obj.objectiveId);
  const minYesCounts = getMinYesCountMap(objectives);
  return (
    <>
      <p>
        An MPA counts toward an objective if it meets the minimum level of
        protection for that objective.
      </p>
      <table>
        <thead>
          <tr>
            <th>Objective</th>
            <th>Minimum MPA Classification Required</th>
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
    </>
  );
};
