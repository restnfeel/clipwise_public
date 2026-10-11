import { themeQuartz } from "ag-grid-community";

// --cw-* 변수를 그대로 써서 라이트·다크 테마 토글을 따라간다.
export const cwGridTheme = themeQuartz.withParams({
  fontFamily: "inherit",
  fontSize: 14,
  headerFontSize: 12,
  headerFontWeight: 600,
  foregroundColor: "var(--cw-ink)",
  textColor: "var(--cw-body)",
  backgroundColor: "var(--cw-panel)",
  headerBackgroundColor: "var(--cw-panel)",
  headerTextColor: "var(--cw-muted)",
  oddRowBackgroundColor: "var(--cw-panel)",
  rowHoverColor: "var(--cw-paper)",
  selectedRowBackgroundColor: { ref: "accentColor", mix: 0.08 },
  accentColor: "var(--cw-accent)",
  borderColor: "var(--cw-border)",
  // 그리드 바깥 박스 없이 헤더·행 구분선만 남긴다.
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  borderRadius: 0,
  rowBorder: true,
  columnBorder: false,
  spacing: 8,
  browserColorScheme: "inherit",
});
