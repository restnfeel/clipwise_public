"use client";

import { useCallback, useState } from "react";
import type { ColDef, SelectionChangedEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { Eye, FolderInput, Globe, Sparkles } from "lucide-react";
import { CwDataGrid } from "@/components/grid/CwDataGrid";
import { GRID_MULTILINE_CELL, kstDateTimeFormatter } from "@/components/grid/cw-grid-cells";
import { categoryHex, UNCATEGORIZED_HEX } from "@/components/knowledge/hub/category-colors";
import { STATUS_LABELS, type KnowledgeCategory, type KnowledgeItem } from "@/components/knowledge/hub/hub-client";

const STATUS_STYLES: Record<string, string> = { draft: "border-[var(--cw-border)] text-[var(--cw-muted)]", reviewed: "border-[var(--cw-accent)] text-[var(--cw-accent)]", published: "border-[var(--cw-accent)] bg-[var(--cw-accent)] text-white" };

export function CategoryBadge({ item }: { item: Pick<KnowledgeItem, "category" | "category_source"> }) {
  if (!item.category) return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--cw-muted)]"><span className="h-2 w-2 rounded-full border" style={{ borderColor: UNCATEGORIZED_HEX }} />미분류</span>;
  return <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[var(--cw-ink)]">
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryHex(item.category.color) }} />
    <span className="truncate">{item.category.name}</span>
    {item.category_source === "ai" && <Sparkles className="h-3 w-3 shrink-0 text-[var(--cw-muted)]" aria-label="AI 분류" />}
  </span>;
}

function TitleCell({ data }: CustomCellRendererProps<KnowledgeItem>) {
  if (!data) return null;
  return <div className="min-w-0 py-2">
    <p className="truncate font-semibold text-[var(--cw-ink)]">{data.title}</p>
    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--cw-muted)]">{data.summary || data.body || "요약 없음"}</p>
    <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-[var(--cw-muted)]">{data.source_system}</p>
  </div>;
}

function CategoryCell({ data }: CustomCellRendererProps<KnowledgeItem>) {
  return data ? <div className="flex h-full items-center"><CategoryBadge item={data} /></div> : null;
}

function TagsCell({ data }: CustomCellRendererProps<KnowledgeItem>) {
  if (!data?.topics?.length) return <span className="text-xs text-[var(--cw-muted)]">—</span>;
  return <div className="flex flex-wrap gap-1 py-2">{data.topics.slice(0, 4).map((topic) => <span key={topic} className="bg-[var(--cw-paper)] px-1.5 py-0.5 text-[11px] leading-4 text-[var(--cw-muted)]">#{topic}</span>)}{data.topics.length > 4 && <span className="text-[11px] text-[var(--cw-muted)]">+{data.topics.length - 4}</span>}</div>;
}

function StatusCell({ value, data }: CustomCellRendererProps<KnowledgeItem, string>) {
  return <div className="flex flex-col items-start gap-1 py-2">
    <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-xs font-semibold leading-5 ${STATUS_STYLES[value || ""] || "border-[var(--cw-border)] text-[var(--cw-muted)]"}`}>{STATUS_LABELS[value || ""] || value}</span>
    {data?.archive?.status === "published" && <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[var(--cw-accent)]"><Globe className="h-3 w-3" />아카이브</span>}
  </div>;
}

const COLUMNS: ColDef<KnowledgeItem>[] = [
  { field: "title", headerName: "제목 · 요약", flex: 1, minWidth: 300, cellRenderer: TitleCell, cellStyle: GRID_MULTILINE_CELL, filter: "agTextColumnFilter" },
  { colId: "category", headerName: "분류", width: 160, valueGetter: (p) => p.data?.category?.name || "", cellRenderer: CategoryCell, cellStyle: GRID_MULTILINE_CELL },
  { colId: "topics", headerName: "태그", width: 220, sortable: false, valueGetter: (p) => (p.data?.topics || []).join(" "), cellRenderer: TagsCell, cellStyle: GRID_MULTILINE_CELL },
  { field: "status", headerName: "상태", width: 110, cellRenderer: StatusCell, cellStyle: GRID_MULTILINE_CELL, comparator: (a: string, b: string) => (STATUS_LABELS[a] || a).localeCompare(STATUS_LABELS[b] || b, "ko") },
  { field: "updated_at", headerName: "수정일", width: 170, sort: "desc", valueFormatter: kstDateTimeFormatter },
];

const ROW_SELECTION = { mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false } as const;

type Props = {
  items: KnowledgeItem[];
  categories: KnowledgeCategory[];
  activeId: string | null;
  loading: boolean;
  onOpen: (id: string) => void;
  onBulkAssign: (itemIds: string[], categoryId: string | null) => Promise<boolean>;
};

export function KnowledgeListView({ items, categories, activeId, loading, onOpen, onBulkAssign }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [assigning, setAssigning] = useState(false);
  const onSelectionChanged = useCallback((event: SelectionChangedEvent<KnowledgeItem>) => setSelected(event.api.getSelectedRows().map((row) => row.id)), []);
  const assign = async () => {
    setAssigning(true);
    const ok = await onBulkAssign(selected, target === "none" ? null : target);
    setAssigning(false);
    if (ok) setTarget("");
  };
  return <div className="space-y-3">
    {selected.length > 0 && <div className="hidden flex-wrap items-center gap-2 border border-[var(--cw-accent)] bg-[var(--cw-panel)] px-4 py-3 text-sm lg:flex">
      <span className="font-semibold text-[var(--cw-ink)]">{selected.length}건 선택</span>
      <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="지정할 분류" className="ml-auto border border-[var(--cw-border)] bg-[var(--cw-paper)] px-2 py-2 text-xs">
        <option value="">분류 선택…</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        <option value="none">미분류로 되돌리기</option>
      </select>
      <button type="button" disabled={!target || assigning} onClick={() => void assign()} className="inline-flex items-center gap-1 border border-[var(--cw-accent)] bg-[var(--cw-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><FolderInput className="h-3 w-3" /> 분류 지정</button>
    </div>}
    <CwDataGrid<KnowledgeItem>
      className="hidden lg:block"
      rowData={items}
      columnDefs={COLUMNS}
      getRowId={(p) => p.data.id}
      rowHeight={92}
      rowSelection={ROW_SELECTION}
      onSelectionChanged={onSelectionChanged}
      activeRowId={activeId}
      onOpenRow={(row) => onOpen(row.id)}
      loading={loading}
    />
    <div className="grid gap-4 lg:hidden">
      {items.map((item) => <article key={item.id} className={`border bg-[var(--cw-panel)] p-5 ${activeId === item.id ? "border-[var(--cw-accent)]" : "border-[var(--cw-border)]"}`}>
        <div className="flex items-center justify-between gap-3 text-xs"><CategoryBadge item={item} /><span className="shrink-0 text-[var(--cw-muted)]">{STATUS_LABELS[item.status] || item.status}</span></div>
        <h3 className="mt-3 font-serif text-xl">{item.title}</h3>
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-[var(--cw-body)]">{item.summary || item.body || "요약 없음"}</p>
        {item.topics?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.topics.map((topic) => <span key={topic} className="bg-[var(--cw-paper)] px-2 py-0.5 text-xs text-[var(--cw-muted)]">#{topic}</span>)}</div>}
        <button type="button" onClick={() => onOpen(item.id)} className="mt-4 inline-flex items-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-[var(--cw-ink)] hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)]"><Eye className="h-3 w-3" /> 상세보기</button>
      </article>)}
    </div>
  </div>;
}
