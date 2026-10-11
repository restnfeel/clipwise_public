import { CATEGORY_COLORS, type CategoryColor } from "@/lib/knowledge/hub/types";

/** 라이트·다크 배경 모두에서 구분되는 중간 채도 색. SVG 점과 사이드바 점이 같은 값을 쓴다. */
const HEX: Record<CategoryColor, string> = {
  amber: "#d97706",
  teal: "#0d9488",
  rose: "#e11d48",
  indigo: "#6366f1",
  lime: "#65a30d",
  sky: "#0284c7",
  violet: "#8b5cf6",
  orange: "#ea580c",
};

export const UNCATEGORIZED_HEX = "#9ca3af";

export const CATEGORY_COLOR_LABELS: Record<CategoryColor, string> = {
  amber: "호박", teal: "청록", rose: "장미", indigo: "남색", lime: "연두", sky: "하늘", violet: "보라", orange: "주황",
};

export { CATEGORY_COLORS };

export const categoryHex = (color?: string | null) => (color && color in HEX ? HEX[color as CategoryColor] : UNCATEGORIZED_HEX);
