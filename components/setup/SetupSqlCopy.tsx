"use client";

import { useState } from "react";

export function SetupSqlCopy({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(sql); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold tracking-[0.18em] text-[var(--cw-accent)]">0001_CLIPWISE_PUBLIC_INIT.SQL</p><button type="button" onClick={() => void copy()} className="border border-[var(--cw-accent)] px-4 py-2 text-sm font-semibold text-[var(--cw-accent)]">{copied ? "복사 완료" : "SQL 전체 복사"}</button></div><textarea readOnly value={sql} aria-label="Clipwise 초기화 SQL" className="mt-3 h-[min(60vh,38rem)] w-full resize-y border border-[var(--cw-border)] bg-[#1e1b18] p-4 font-mono text-xs leading-6 text-[#f7eee4] outline-none" /></div>;
}
