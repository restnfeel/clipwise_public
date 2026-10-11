"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

type Props = {
  eyebrow: ReactNode;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 항목에 대한 모든 작업. 파괴적 작업은 왼쪽(`mr-auto`), 주 작업은 오른쪽에 둔다. */
  footer?: ReactNode;
};

// 그리드 상세 공용 우측 드로워. 규칙: INTENT.md「상세 드로워」, docs/DESIGN.md「Detail drawer」.
export function CwDetailDrawer({ eyebrow, title, onClose, children, footer }: Props) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <>
    <div className="fixed inset-0 z-[90] bg-black/45 lg:bg-black/20 lg:backdrop-blur-[2px]" role="presentation" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-label={`${title} 상세`} className={`fixed inset-y-0 right-0 z-[95] flex w-full flex-col border-l border-[var(--cw-border)] bg-[var(--cw-paper)] text-[var(--cw-ink)] shadow-2xl transition-[width] ${wide ? "lg:w-[90vw]" : "lg:w-[70vw]"}`}>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--cw-border)] px-6 py-5">
        <div className="min-w-0"><p className="text-xs uppercase tracking-[0.18em] text-[var(--cw-accent)]">{eyebrow}</p><h3 className="mt-2 break-words font-serif text-2xl">{title}</h3></div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setWide((value) => !value)} className="hidden h-9 w-9 place-items-center border border-[var(--cw-border)] lg:grid" aria-label={wide ? "기본 크기로 보기" : "크게 보기"}>{wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-[var(--cw-border)]" aria-label="상세 닫기"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm leading-7 text-[var(--cw-body)]">{children}</div>
      {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--cw-border)] px-6 py-4">{footer}</div> : null}
    </aside>
  </>;
}
