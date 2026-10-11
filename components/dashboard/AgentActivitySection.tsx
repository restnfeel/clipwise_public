"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, Check, Clock3, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { CwRefreshButton } from "@/components/cw/CwRefreshButton";
import { notice } from "@/lib/notice";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { CwDataGrid } from "@/components/grid/CwDataGrid";
import { GRID_ACTION_CLASS, GRID_MULTILINE_CELL, kstDateTimeFormatter, stopRowClick } from "@/components/grid/cw-grid-cells";

type Run = { id: string; task_type: string; input_summary: string | null; status: string; result_summary: string | null; started_at: string; duration_ms: number | null };
type Feedback = { run_id: string | null; rating: string };

type RunRow = Run & { rated: string | null; saving: boolean };
type RunGridContext = { onFeedback: (run: Run, rating: "good" | "needs_improvement") => void };

function RunStatusCell({ value }: CustomCellRendererProps<RunRow, string>) {
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${value === "completed" ? "text-emerald-700" : value === "failed" ? "text-red-700" : "text-[var(--cw-muted)]"}`}>{value === "completed" ? <Check className="h-3.5 w-3.5" /> : value === "failed" ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />} {value}</span>;
}

function RunSummaryCell({ data }: CustomCellRendererProps<RunRow>) {
  if (!data) return null;
  return <div className="min-w-0 py-2"><p className="truncate font-semibold text-[var(--cw-ink)]">{data.input_summary || data.task_type}</p>{data.result_summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--cw-muted)]">{data.result_summary}</p> : null}</div>;
}

function RunFeedbackCell({ data, context }: CustomCellRendererProps<RunRow, unknown, RunGridContext>) {
  if (!data) return null;
  return <div className="flex h-full items-center justify-end gap-1.5">
    <button type="button" disabled={data.saving} onClick={(e) => stopRowClick(e, () => context.onFeedback(data, "good"))} className={`${GRID_ACTION_CLASS} ${data.rated === "good" ? "border-emerald-600 text-emerald-700" : ""}`}><ThumbsUp className="h-3 w-3" /> 좋음</button>
    <button type="button" disabled={data.saving} onClick={(e) => stopRowClick(e, () => context.onFeedback(data, "needs_improvement"))} className={`${GRID_ACTION_CLASS} ${data.rated === "needs_improvement" ? "border-amber-600 text-amber-700" : ""}`}><ThumbsDown className="h-3 w-3" /> 개선 필요</button>
  </div>;
}

const RUN_COLUMNS: ColDef<RunRow>[] = [
  { field: "status", headerName: "상태", width: 130, cellRenderer: RunStatusCell, cellStyle: GRID_MULTILINE_CELL },
  { colId: "summary", headerName: "요청 · 결과", flex: 1, minWidth: 320, valueGetter: (p) => p.data?.input_summary || p.data?.task_type || "", cellRenderer: RunSummaryCell, cellStyle: GRID_MULTILINE_CELL, filter: "agTextColumnFilter" },
  { field: "started_at", headerName: "실행 시각", width: 170, sort: "desc", valueFormatter: kstDateTimeFormatter },
  { field: "duration_ms", headerName: "소요", width: 110, valueFormatter: (p) => (p.value ? `${Number(p.value).toLocaleString("ko-KR")}ms` : "") },
  { colId: "feedback", headerName: "답변 평가", width: 210, sortable: false, cellRenderer: RunFeedbackCell, cellStyle: GRID_MULTILINE_CELL, headerClass: "ag-right-aligned-header" },
];

export function AgentActivitySection() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/agent/runs", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "에이전트 활동을 읽지 못했습니다.");
      setRuns(body.runs || []); setFeedback(body.feedback || []);
    } catch (error) { notice.error(error instanceof Error ? error.message : "에이전트 활동을 읽지 못했습니다."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const sendFeedback = async (run: Run, rating: "good" | "needs_improvement") => {
    setSaving(run.id);
    try {
      const response = await fetch("/api/agent/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: run.id, rating }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "평가를 저장하지 못했습니다.");
      setFeedback((current) => [...current.filter((item) => item.run_id !== run.id), { run_id: run.id, rating }]);
      notice.success(rating === "good" ? "좋은 답변으로 기록했습니다." : "개선 후보로 기록했습니다.");
    } catch (error) { notice.error(error instanceof Error ? error.message : "평가를 저장하지 못했습니다."); }
    finally { setSaving(null); }
  };

  if (loading) return <><div className="flex justify-center py-20 lg:hidden"><Loader2 className="h-6 w-6 animate-spin text-[var(--cw-accent)]" /></div><CwDataGrid<RunRow> className="hidden lg:block" loading rowData={[]} columnDefs={RUN_COLUMNS} /></>;
  return <section className="border border-[var(--cw-border)] bg-[var(--cw-panel)] lg:border-0 lg:bg-transparent">
    <div className="flex items-center justify-between border-b border-[var(--cw-border)] px-6 py-5 lg:px-0"><div><p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">AGENT ACTIVITY</p><h2 className="mt-2 font-serif text-2xl">내 에이전트 활동</h2></div><CwRefreshButton onRefresh={() => void load()} loading={loading} label="에이전트 활동 새로고침" className="py-2" /></div>
    {runs.length === 0 ? <div className="px-6 py-16 text-center"><Activity className="mx-auto h-8 w-8 text-[var(--cw-accent)]" /><p className="mt-4 font-serif text-xl">아직 기록된 실행이 없습니다.</p><p className="mt-2 text-sm text-[var(--cw-body)]">Claude에서 Clipwise 지식을 사용하면 실행 기록이 쌓입니다.</p></div> : <><div className="hidden pt-4 lg:block"><CwDataGrid<RunRow> rowData={runs.map((run) => ({ ...run, rated: feedback.find((item) => item.run_id === run.id)?.rating ?? null, saving: Boolean(saving) }))} columnDefs={RUN_COLUMNS} getRowId={(p) => p.data.id} rowHeight={72} context={{ onFeedback: (run: Run, rating: "good" | "needs_improvement") => void sendFeedback(run, rating) } satisfies RunGridContext} /></div><div className="divide-y divide-[var(--cw-border)] lg:hidden">{runs.map((run) => { const rated = feedback.find((item) => item.run_id === run.id)?.rating; return <article key={run.id} className="px-6 py-5"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 text-xs font-semibold ${run.status === "completed" ? "text-emerald-700" : run.status === "failed" ? "text-red-700" : "text-[var(--cw-muted)]"}`}>{run.status === "completed" ? <Check className="h-3.5 w-3.5" /> : run.status === "failed" ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />} {run.status}</span><span className="text-xs text-[var(--cw-muted)]">{new Date(run.started_at).toLocaleString("ko-KR")}</span>{run.duration_ms ? <span className="text-xs text-[var(--cw-muted)]">{run.duration_ms}ms</span> : null}</div><p className="mt-2 font-semibold">{run.input_summary || run.task_type}</p>{run.result_summary ? <p className="mt-1 text-sm leading-6 text-[var(--cw-body)]">{run.result_summary}</p> : null}<div className="mt-4 flex items-center gap-2"><span className="mr-2 text-xs text-[var(--cw-muted)]">답변 평가</span><button type="button" disabled={Boolean(saving)} onClick={() => void sendFeedback(run, "good")} className={`inline-flex items-center gap-1 border px-3 py-1.5 text-xs ${rated === "good" ? "border-emerald-600 text-emerald-700" : "border-[var(--cw-border)]"}`}><ThumbsUp className="h-3.5 w-3.5" /> 좋음</button><button type="button" disabled={Boolean(saving)} onClick={() => void sendFeedback(run, "needs_improvement")} className={`inline-flex items-center gap-1 border px-3 py-1.5 text-xs ${rated === "needs_improvement" ? "border-amber-600 text-amber-700" : "border-[var(--cw-border)]"}`}><ThumbsDown className="h-3.5 w-3.5" /> 개선 필요</button></div></article>; })}</div></>}
  </section>;
}
