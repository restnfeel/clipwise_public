"use client";

import { RefreshCw } from "lucide-react";

type Props = {
  onRefresh: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
};

export function CwRefreshButton({ onRefresh, loading = false, label = "목록 새로고침", className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      aria-label={label}
      title="새로고침"
      className={`inline-flex shrink-0 items-center justify-center border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-3 text-sm text-[var(--cw-muted)] transition hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)] disabled:opacity-50 ${className}`}
    >
      <span className={loading ? "animate-spin" : ""}>
        <RefreshCw className="h-4 w-4" />
      </span>
    </button>
  );
}
