import React from "react";
import {
  Metric,
  MetricGroup,
  ReportResult,
  flattenBySketchAllClass,
  metricsWithSketchId,
  percentWithEdge,
  toNullSketchArray,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import {
  Column,
  Table,
  ReportTableStyled,
} from "@seasketch/geoprocessing/client-ui";
import styled from "styled-components";

interface SketchTableProps {
  printing: boolean;
}

const PercentSketchTableStyled = styled(ReportTableStyled)<SketchTableProps>`
  & {
    width: 100%;
    overflow-x: ${(props) => (props.printing ? "visible" : "scroll")};
    font-size: 12px;
  }

  & td,
  th {
    text-align: center;
    min-width: 40px;
  }

  td:not(:last-child),
  th:not(:last-child) {
    border-right: 2px solid #efefef;
  }

  td:not(:first-child) {
    white-space: nowrap;
  }

  & th:first-child,
  & td:first-child {
    min-width: 140px;
    position: sticky;
    left: 0;
    text-align: left;
    background: #efefef;
  }
`;

/**
 * Creates "Show by Zone" report, with only percentages
 * @param data data returned from lambda
 * @param precalcMetrics metrics from precalc.json
 * @param mg metric group to get stats for
 * @param t TFunction
 */
export const genSketchTable = (
  data: ReportResult,
  precalcMetrics: Metric[],
  mg: MetricGroup,
  printing: boolean = false
) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === mg.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    mg.classes,
    childSketches
  );

  const zoneLabel = "MPA";

  const classColumns: Column<Record<string, string | number>>[] =
    mg.classes.map((curClass) => ({
      Header: curClass.display,
      accessor: (row) =>
        percentWithEdge(
          isNaN(row[curClass.classId] as number)
            ? 0
            : (row[curClass.classId] as number)
        ),
    }));

  const columns: Column<Record<string, string | number>>[] = [
    {
      Header: zoneLabel,
      accessor: (row) => row.sketchName,
    },
    ...classColumns,
  ];

  if (printing) {
    const tables: JSX.Element[] = [];
    const totalClasses = mg.classes.length;
    const numTables = Math.ceil(totalClasses / 5);

    for (let i = 0; i < numTables; i++) {
      const startIndex = i * 5;
      const endIndex = Math.min((i + 1) * 5, totalClasses);

      const tableColumns: Column<Record<string, string | number>>[] = [
        columns[0], // "This plan contains" column
        ...classColumns.slice(startIndex, endIndex),
      ];

      tables.push(
        <PercentSketchTableStyled printing={printing}>
          <Table
            className="styled"
            columns={tableColumns}
            data={sketchRows.sort((a, b) =>
              (a.sketchName as string).localeCompare(b.sketchName as string)
            )}
            manualPagination={printing}
          />
        </PercentSketchTableStyled>
      );
    }

    return tables;
  }

  // If not printing, return a single table
  return (
    <PercentSketchTableStyled printing={printing}>
      <Table
        className="styled"
        columns={columns}
        data={sketchRows.sort((a, b) =>
          (a.sketchName as string).localeCompare(b.sketchName as string)
        )}
        manualPagination={printing}
      />
    </PercentSketchTableStyled>
  );
};
