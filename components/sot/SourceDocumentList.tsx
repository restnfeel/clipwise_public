"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, FileText, Loader2, Search } from "lucide-react";
import { CwRefreshButton } from "@/components/cw/CwRefreshButton";
import { notice } from "@/lib/notice";
import { getSourceProviderInfo } from "@/lib/sot/providers";
import type { ColDef, SelectionChangedEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { CwDataGrid } from "@/components/grid/CwDataGrid";
import { CwDetailDrawer } from "@/components/cw/CwDetailDrawer";
import { GRID_MULTILINE_CELL, kstDateTimeFormatter } from "@/components/grid/cw-grid-cells";

type SourceDocument = { id: string; source_system: string; title: string; body: string; source_updated_at: string | null; source_url: string | null; status: string; metadata?: Record<string, unknown> | null };

type Props = {
  provider: string | null;
  reloadKey?: number;
  emptyMessage?: string;
  onClearProvider?: () => void;
};

const STATUS_LABELS: Record<string, string> = { active: "보관 중", unavailable: "원본 없음", excluded: "제외됨" };
const ROW_SELECTION = { mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false } as const;

const isExcluded = (document: SourceDocument) => document.metadata?.excluded === true;
const statusLabel = (document: SourceDocument) => STATUS_LABELS[isExcluded(document) ? "excluded" : document.status] || document.status;

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function DocumentTitleCell({ data }: CustomCellRendererProps<SourceDocument>) {
  if (!data) return null;
  return <div className={`min-w-0 py-2 ${isExcluded(data) ? "opacity-50" : ""}`}><p className="truncate font-semibold text-[var(--cw-ink)]">{data.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--cw-muted)]">{data.body || "본문 없음"}</p></div>;
}

function StatusCell({ data }: CustomCellRendererProps<SourceDocument>) {
  if (!data) return null;
  return <span className={`text-xs font-semibold ${isExcluded(data) ? "text-red-600" : "text-[var(--cw-body)]"}`}>{statusLabel(data)}</span>;
}

const DOCUMENT_COLUMNS: ColDef<SourceDocument>[] = [
  { field: "title", headerName: "제목 · 본문", flex: 1, minWidth: 320, cellRenderer: DocumentTitleCell, cellStyle: GRID_MULTILINE_CELL },
  { field: "source_system", headerName: "원본", width: 120, cellClass: "uppercase text-xs font-bold tracking-[0.12em] text-[var(--cw-accent)]" },
  { field: "status", headerName: "상태", width: 120, cellRenderer: StatusCell },
  { field: "source_updated_at", headerName: "원본 갱신", width: 170, sort: "desc", valueFormatter: kstDateTimeFormatter },
];

export function SourceDocumentList({ provider, reloadKey = 0, emptyMessage = "저장된 SOT 원본이 없습니다. 연결된 서비스를 동기화한 뒤 다시 확인하세요.", onClearProvider }: Props) {
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SourceDocument | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [showExcluded, setShowExcluded] = useState(false);
  const [saving, setSaving] = useState(false);
  const closeDetail = useCallback(() => setSelected(null), []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (provider) params.set("provider", provider);
      const response = await fetch(`/api/sot/documents${params.size ? `?${params}` : ""}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "원본을 불러오지 못했습니다.");
      setDocuments(body.documents || []);
      setCheckedIds([]);
    } catch (error) { notice.error(error instanceof Error ? error.message : "원본을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [query, provider]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, reloadKey]);

  const setExcluded = useCallback(async (ids: string[], excluded: boolean) => {
    if (!ids.length) return;
    setSaving(true);
    try {
      const response = await fetch("/api/sot/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, excluded }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "원본 제외 상태를 저장하지 못했습니다.");
      const skipped = body.skipped ? ` (권한이 없는 ${Number(body.skipped).toLocaleString("ko-KR")}건 제외)` : "";
      notice.success(`${Number(body.updated || 0).toLocaleString("ko-KR")}건을 ${excluded ? "제외했습니다" : "다시 포함했습니다"}${skipped}`);
      setSelected(null);
      await load();
    } catch (error) { notice.error(error instanceof Error ? error.message : "원본 제외 상태를 저장하지 못했습니다."); }
    finally { setSaving(false); }
  }, [load]);

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<SourceDocument>) => setCheckedIds(event.api.getSelectedRows().map((row) => row.id)), []);
  const excludedCount = documents.filter(isExcluded).length;
  const visibleDocuments = showExcluded ? documents : documents.filter((document) => !isExcluded(document));
  const checkedDocuments = visibleDocuments.filter((document) => checkedIds.includes(document.id));
  const checkedExcluded = checkedDocuments.filter(isExcluded).map((document) => document.id);
  const checkedIncluded = checkedDocuments.filter((document) => !isExcluded(document)).map((document) => document.id);
  const providerLabel = provider ? getSourceProviderInfo(provider)?.label || provider : null;
  const actionClass = "inline-flex shrink-0 items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold disabled:opacity-50";

  return <section className="border border-[var(--cw-border)] bg-[var(--cw-panel)] lg:border-0 lg:bg-transparent">
    <div className="flex flex-col gap-3 border-b border-[var(--cw-border)] p-5 sm:flex-row sm:flex-wrap lg:px-0">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--cw-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="원본 제목이나 내용 검색" className="w-full border border-[var(--cw-border)] bg-[var(--cw-paper)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--cw-accent)]" /></div>
      {providerLabel && onClearProvider ? <button type="button" onClick={onClearProvider} className="self-center text-xs font-semibold text-[var(--cw-accent)]">{providerLabel}만 보는 중 · 전체 보기</button> : null}
      <label className="inline-flex items-center gap-2 self-center text-xs text-[var(--cw-body)]"><input type="checkbox" checked={showExcluded} onChange={(event) => setShowExcluded(event.target.checked)} /> 제외한 원본 보기 ({excludedCount.toLocaleString("ko-KR")})</label>
      <span className="self-center text-xs text-[var(--cw-muted)]">{visibleDocuments.length.toLocaleString("ko-KR")}건</span>
      <CwRefreshButton onRefresh={() => void load()} loading={loading} label="원본 목록 새로고침" className="py-2.5" />
    </div>
    {checkedDocuments.length ? <div className="hidden items-center gap-2 border-b border-[var(--cw-border)] py-3 lg:flex">
      <span className="text-xs text-[var(--cw-muted)]">{checkedDocuments.length.toLocaleString("ko-KR")}건 선택</span>
      {checkedIncluded.length ? <button type="button" disabled={saving} onClick={() => void setExcluded(checkedIncluded, true)} className={`${actionClass} border-red-300 text-red-700 hover:bg-red-50`}><EyeOff className="h-4 w-4" /> 선택 {checkedIncluded.length.toLocaleString("ko-KR")}건 제외</button> : null}
      {checkedExcluded.length ? <button type="button" disabled={saving} onClick={() => void setExcluded(checkedExcluded, false)} className={`${actionClass} border-[var(--cw-accent)] text-[var(--cw-accent)]`}><Eye className="h-4 w-4" /> 선택 {checkedExcluded.length.toLocaleString("ko-KR")}건 다시 포함</button> : null}
    </div> : null}
    {loading || visibleDocuments.length > 0 ? <CwDataGrid<SourceDocument> className="hidden pt-4 lg:block" rowData={visibleDocuments} columnDefs={DOCUMENT_COLUMNS} getRowId={(p) => p.data.id} rowHeight={80} activeRowId={selected?.id ?? null} onOpenRow={setSelected} loading={loading} rowSelection={ROW_SELECTION} onSelectionChanged={onSelectionChanged} /> : null}
    {loading ? <div className="flex justify-center py-16 lg:hidden"><Loader2 className="h-6 w-6 animate-spin text-[var(--cw-accent)]" /></div>
      : visibleDocuments.length === 0 ? <p className="px-5 py-16 text-center text-sm text-[var(--cw-muted)]">{emptyMessage}</p>
      : <><ul className="divide-y divide-[var(--cw-border)] lg:hidden">{visibleDocuments.map((document) => <li key={document.id} className={`flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${isExcluded(document) ? "opacity-60" : ""}`}>
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cw-accent)]">{document.source_system}</span><span className={`text-xs ${isExcluded(document) ? "font-semibold text-red-600" : "text-[var(--cw-muted)]"}`}>{statusLabel(document)}</span>{document.source_updated_at ? <span className="text-xs text-[var(--cw-muted)]">· {formatDate(document.source_updated_at)}</span> : null}</div><h3 className="mt-2 truncate font-serif text-xl">{document.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--cw-body)]">{document.body || "본문 없음"}</p></div>
        <button type="button" onClick={() => setSelected(document)} className="inline-flex shrink-0 items-center justify-center gap-2 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-[var(--cw-body)] hover:border-[var(--cw-accent)]"><FileText className="h-4 w-4" /> 원본 보기</button>
      </li>)}</ul></>}
    {selected ? <CwDetailDrawer
      eyebrow={`${selected.source_system} · SOT · ${statusLabel(selected)}${selected.source_updated_at ? ` · ${formatDate(selected.source_updated_at)} 갱신` : ""}`}
      title={selected.title}
      onClose={closeDetail}
      footer={<div className="flex flex-wrap items-center gap-2">
        {isExcluded(selected)
          ? <button type="button" disabled={saving} onClick={() => void setExcluded([selected.id], false)} className={`${actionClass} border-[var(--cw-accent)] text-[var(--cw-accent)]`}><Eye className="h-4 w-4" /> 다시 포함</button>
          : <button type="button" disabled={saving} onClick={() => void setExcluded([selected.id], true)} className={`${actionClass} border-red-300 text-red-700 hover:bg-red-50`}><EyeOff className="h-4 w-4" /> 이 원본 제외</button>}
        {selected.source_url ? <a href={selected.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-[var(--cw-accent)] bg-[var(--cw-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90">원본 서비스에서 열기 <ExternalLink className="h-3 w-3" /></a> : null}
      </div>}
    >
      {isExcluded(selected) ? <p className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">제외한 원본입니다. 지식 추출·검색 등 Clipwise 기능에서 사용하지 않으며, 다시 동기화해도 제외 상태가 유지됩니다.</p> : null}
      <section><p className="text-xs font-semibold text-[var(--cw-ink)]">원문</p><p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[var(--cw-border)] pl-4">{selected.body || "본문 없음"}</p></section>
    </CwDetailDrawer> : null}
  </section>;
}
