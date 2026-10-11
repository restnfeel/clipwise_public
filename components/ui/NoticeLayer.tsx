"use client";

import { resolveValue, toast, useToaster, type Toast, type ToastType } from "react-hot-toast";
import { CheckCircle, Info, Loader2, X, XCircle, type LucideIcon } from "lucide-react";

const TONES: Record<ToastType, { icon: LucideIcon; iconClass: string }> = {
  success: { icon: CheckCircle, iconClass: "text-emerald-500" },
  error: { icon: XCircle, iconClass: "text-[var(--cw-accent)]" },
  loading: { icon: Loader2, iconClass: "animate-spin text-[var(--cw-muted)]" },
  blank: { icon: Info, iconClass: "text-[var(--cw-accent)]" },
  custom: { icon: Info, iconClass: "text-[var(--cw-accent)]" },
};

/**
 * 앱 공통 레이어드 팝업. 루트 Providers에 한 번만 마운트한다.
 * 화면에서는 `notice.*`(lib/notice) 또는 `toast.*`로 호출하면 이 레이어에 표시된다.
 */
export function NoticeLayer() {
  const { toasts, handlers } = useToaster({ success: { duration: 2500 }, error: { duration: 4500 } });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-6 z-[10000] flex flex-col items-center gap-2 px-4"
      onMouseEnter={handlers.startPause}
      onMouseLeave={handlers.endPause}
    >
      {toasts.map((item) => <NoticeCard key={item.id} item={item} />)}
    </div>
  );
}

function NoticeCard({ item }: { item: Toast }) {
  const tone = TONES[item.type];
  const Icon = tone.icon;
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border border-[var(--cw-border)] bg-[var(--cw-panel)] px-4 py-3 text-sm text-[var(--cw-ink)] shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all duration-200 ${item.visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
    >
      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClass}`} aria-hidden="true" />}
      <div className="min-w-0 flex-1 leading-6" {...item.ariaProps}>{resolveValue(item.message, item)}</div>
      {item.type !== "loading" ? (
        <button type="button" onClick={() => toast.dismiss(item.id)} className="shrink-0 text-[var(--cw-muted)] transition hover:text-[var(--cw-ink)]" aria-label="알림 닫기">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
