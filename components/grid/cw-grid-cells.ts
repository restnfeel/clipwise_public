import type { MouseEvent } from "react";
import type { CellStyle, ValueFormatterParams } from "ag-grid-community";

export const GRID_ACTION_CLASS = "inline-flex items-center gap-1 whitespace-nowrap border border-[var(--cw-border)] px-2 py-1 text-xs font-semibold leading-5 hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)] disabled:cursor-not-allowed disabled:opacity-50";

// 여러 줄 셀(제목+요약, 버튼 묶음)은 행 높이 기준 line-height를 풀고 세로 가운데 정렬한다.
export const GRID_MULTILINE_CELL: CellStyle = { lineHeight: "1.4", whiteSpace: "normal", display: "flex", alignItems: "center" };

export function formatKstDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" });
}

export const kstDateTimeFormatter = (params: ValueFormatterParams) => formatKstDateTime(params.value as string | null);

// 셀 안 버튼 클릭이 행 클릭(상세 열기)으로 번지지 않게 막는다.
export function stopRowClick(event: MouseEvent, run: () => void) {
  event.stopPropagation();
  run();
}
