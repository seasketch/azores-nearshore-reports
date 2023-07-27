import React from "react";
import {
  ResultsCard,
  ReportError,
  Collapse,
  Column,
  Table,
  ReportTableStyled,
  PointyCircle,
  RbcsMpaClassPanelProps,
  RbcsIcon,
  GroupPill,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  NullSketch,
  NullSketchCollection,
  Metric,
  isNullSketchCollection,
  keyBy,
  toNullSketchArray,
  getKeys,
  Objective,
  getJsonUserAttribute,
} from "@seasketch/geoprocessing/client-core";
import styled from "styled-components";
import project from "../../project";
import { getMinYesCountMap } from "@seasketch/geoprocessing/src";

export const SmallReportTableStyled = styled(ReportTableStyled)`
  .styled {
    font-size: 13px;
  }
`;

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

// Get metric group
const mg = project.getMetricGroup("protectionCountOverlap");

/**
 * @returns Protection card JSX.Element
 */
export const ProtectionCard = () => {
  return (
    <ResultsCard title="Protection Level" functionName="protection">
      {(data: ReportResult) => {
        return (
          <ReportError>
            {isNullSketchCollection(data.sketch)
              ? sketchCollectionReport(data.sketch, data.metrics)
              : sketchReport(data.metrics)}
          </ReportError>
        );
      }}
    </ResultsCard>
  );
};

/**
 * Report protection level for single sketch
 */
const sketchReport = (metrics: Metric[]) => {
  // Should only have only a single metric
  if (metrics.length !== 1)
    throw new Error(
      "In single sketch protection report, and getting !=1 metric"
    );

  return (
    <>
      <div
        style={{
          padding: "10px 10px 10px 0px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <RbcsMpaClassPanel
          value={metrics[0].value}
          size={18}
          displayName={groupDisplayMap[metrics[0].groupId || "none"]}
          displayValue={false}
          group={metrics[0].groupId as string | undefined}
          groupColorMap={groupColorMap}
        />
      </div>

      <Collapse title="Learn More">
        <ProtectionLearnMore
          objectives={project.getMetricGroupObjectives(mg) as Objective[]}
        />
      </Collapse>
    </>
  );
};

const sketchCollectionReport = (
  sketch: NullSketchCollection,
  metrics: Metric[]
) => {
  const sketches = toNullSketchArray(sketch);

  const columns: Column<Metric>[] = [
    {
      Header: " ",
      accessor: (row) => (
        <RbcsMpaClassPanel
          value={row.value}
          size={18}
          displayName={
            row.value === 1
              ? groupDisplayMap[row.groupId || "none"]
              : groupDisplayMap[row.groupId || "none"] + "s"
          }
          group={row.groupId as string | undefined}
          groupColorMap={groupColorMap}
        />
      ),
    },
  ];

  return (
    <>
      <Table className="styled" columns={columns} data={metrics} />
      <p>
        MPAs with less than full protection don't count towards some planning
        objectives, so take note of the requirements for each.
      </p>
      <Collapse title="Show by MPA">{genMpaSketchTable(sketches)}</Collapse>
      <Collapse title="Learn More">
        <ProtectionLearnMore
          objectives={project.getMetricGroupObjectives(mg) as Objective[]}
        />
      </Collapse>
    </>
  );
};

const genMpaSketchTable = (sketches: NullSketch[]) => {
  const columns: Column<NullSketch>[] = [
    {
      Header: "MPA",
      accessor: (row) => row.properties.name,
    },
    {
      Header: "Protection Level",
      accessor: (row) => (
        <GroupPill
          groupColorMap={groupColorMap}
          group={getJsonUserAttribute(row.properties, "designation", "")}
        >
          {
            groupDisplayMap[
              getJsonUserAttribute(row.properties, "designation", "")
            ]
          }
        </GroupPill>
      ),
    },
  ];

  return (
    <SmallReportTableStyled>
      <Table
        className="styled"
        columns={columns}
        data={sketches.sort((a, b) =>
          a.properties.name.localeCompare(b.properties.name)
        )}
      />
    </SmallReportTableStyled>
  );
};

interface LearnMoreProps {
  objectives: Objective[];
}

/**
 * Describes protection levels in Azores
 */
export const ProtectionLearnMore: React.FunctionComponent<LearnMoreProps> = ({
  objectives,
}) => {
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
                <td>{minYesCounts[objectiveId]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

/**
 * Sketch collection status panel for MPA regulation-based classification
 */
const RbcsMpaClassPanel: React.FunctionComponent<RbcsMpaClassPanelProps> = ({
  value,
  displayName,
  size,
  displayValue = true,
  group,
  groupColorMap,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ paddingRight: 10 }}>
        {group && groupColorMap ? (
          <PointyCircle size={size} color={groupColorMap[group]}>
            {displayValue ? value : null}
          </PointyCircle>
        ) : (
          <RbcsIcon value={value} size={size} displayValue={displayValue} />
        )}
      </div>
      <div style={{ fontSize: 18 }}>{displayName}</div>
    </div>
  );
};
