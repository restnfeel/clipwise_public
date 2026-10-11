"use client";

import { useEffect, useMemo, useRef } from "react";
import { AgGridProvider, AgGridReact, type AgGridReactProps } from "ag-grid-react";
import type { CellClickedEvent, ColDef, ColGroupDef, RowClassRules } from "ag-grid-community";
import { CW_GRID_MODULES } from "@/components/grid/cw-grid-modules";
import { cwGridTheme } from "@/components/grid/cw-grid-theme";
import { CW_GRID_LOCALE } from "@/components/grid/cw-grid-locale";
import { CwGridLoadingOverlay } from "@/components/grid/CwGridLoadingOverlay";

type CwDataGridProps<T> = AgGridReactProps<T> & {
  height?: number | string;
  className?: string;
  /** 상세 패널·드로워로 열린 행 id. getRowId 결과와 비교해 강조한다. */
  activeRowId?: string | null;
  /** 상세 열기. 첫 번째 컬럼 셀을 클릭했을 때만 호출된다. 행 전체 클릭으로 상세를 열지 않는다. */
  onOpenRow?: (data: T) => void;
};

const OPEN_CELL_CLASS = "cw-grid-open-cell";

function firstColumnId<T>(columnDefs: AgGridReactProps<T>["columnDefs"]) {
  const first = columnDefs?.[0] as ColDef<T> | ColGroupDef<T> | undefined;
  if (!first || "children" in first) return null;
  return first.colId ?? (first.field as string | undefined) ?? null;
}

const DEFAULT_COL_DEF: ColDef = { sortable: true, resizable: true, suppressMovable: true };
const PAGE_SIZES = [10, 20, 50];

// 데스크탑 목록 영역 공용 그리드. 높이를 주지 않으면 행 수에 맞춰 늘어나고 10건씩 페이지를 나눈다.
// 데이터를 불러오는 동안에도 그리드를 렌더하고 `loading`을 넘기면 CwGridLoadingOverlay가 표 안에 뜬다.
export function CwDataGrid<T>({ height, className = "", activeRowId = null, onOpenRow, ...props }: CwDataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const activeRef = useRef<string | null>(activeRowId);
  const autoHeight = height === undefined;

  const rowClassRules = useMemo<RowClassRules<T>>(
    () => ({ ...props.rowClassRules, "cw-grid-row-active": (params) => activeRef.current !== null && params.node.id === activeRef.current }),
    [props.rowClassRules],
  );

  const openColumnId = onOpenRow ? firstColumnId(props.columnDefs) : null;
  const columnDefs = useMemo(() => {
    if (!openColumnId || !props.columnDefs) return props.columnDefs;
    const [first, ...rest] = props.columnDefs as ColDef<T>[];
    const cellClass = [OPEN_CELL_CLASS, ...(Array.isArray(first.cellClass) ? first.cellClass : typeof first.cellClass === "string" ? [first.cellClass] : [])];
    return [{ ...first, cellClass }, ...rest];
  }, [openColumnId, props.columnDefs]);

  const handleCellClicked = (event: CellClickedEvent<T>) => {
    if (onOpenRow && openColumnId && event.data && event.column.getColId() === openColumnId) onOpenRow(event.data);
    props.onCellClicked?.(event);
  };

  useEffect(() => {
    activeRef.current = activeRowId;
    gridRef.current?.api?.redrawRows();
  }, [activeRowId]);

  return (
    <AgGridProvider modules={CW_GRID_MODULES}>
      <div className={`${className}${props.loading ? " cw-grid-loading" : ""}`} style={autoHeight ? undefined : { height }}>
        <AgGridReact<T>
          ref={gridRef}
          theme={cwGridTheme}
          localeText={CW_GRID_LOCALE}
          animateRows={false}
          defaultColDef={DEFAULT_COL_DEF}
          domLayout={autoHeight ? "autoHeight" : "normal"}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={PAGE_SIZES}
          suppressCellFocus
          loadingOverlayComponent={CwGridLoadingOverlay}
          {...props}
          rowClassRules={rowClassRules}
          columnDefs={columnDefs}
          onCellClicked={handleCellClicked}
        />
      </div>
    </AgGridProvider>
  );
}
