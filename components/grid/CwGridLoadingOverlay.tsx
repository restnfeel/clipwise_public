"use client";

import { Loader2 } from "lucide-react";

export const CW_GRID_LOADING_TEXT = "Clipwise 지식을 관리하는 스마트한 비서";

// AG Grid `loading` 상태에서 표 영역 위에 뜨는 공용 로딩 오버레이.
export function CwGridLoadingOverlay() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="status" aria-live="polite">
      <div className="animate-spin text-[var(--cw-accent)]"><Loader2 className="h-7 w-7" /></div>
      <p className="text-sm font-semibold text-[var(--cw-ink)]">{CW_GRID_LOADING_TEXT}</p>
    </div>
  );
}
