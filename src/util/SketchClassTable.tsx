import { percentWithEdge } from "@seasketch/geoprocessing/client-core";
import {
  Column,
  SketchClassTableProps,
  SketchClassTableStyled,
  Table,
} from "@seasketch/geoprocessing/client-ui";
import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Table displaying sketch class metrics, one table row per sketch
 * @param param0
 * @returns
 * --- Differences from GP function ----
 * Handles "class has no values in subregion" NaN values by overwriting NaN with 0
 */
export const SketchClassTable: React.FunctionComponent<SketchClassTableProps> =
  ({ rows, metricGroup: dataGroup, formatPerc: usePerc = false }) => {
    const { t } = useTranslation();

    const mpaLabel = t("MPA");

    const classColumns: Column<Record<string, string | number>>[] =
      dataGroup.classes.map((curClass) => ({
        Header: curClass.display,
        accessor: (row) => {
          return usePerc
            ? percentWithEdge(
                isNaN(row[curClass.classId] as number)
                  ? 0
                  : (row[curClass.classId] as number)
              )
            : row[curClass.classId];
        },
      }));

    const columns: Column<Record<string, string | number>>[] = [
      {
        Header: mpaLabel,
        accessor: (row) => {
          return <div style={{ width: 120 }}>{row.sketchName}</div>;
        },
      },
      ...classColumns,
    ];

    return (
      <SketchClassTableStyled>
        <Table
          className="styled"
          columns={columns}
          data={rows.sort((a, b) =>
            (a.sketchName as string).localeCompare(b.sketchName as string)
          )}
        />
      </SketchClassTableStyled>
    );
  };
