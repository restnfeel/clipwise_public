"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Brain, Cloud, List, Loader2, Search, Share2, Sparkles, X } from "lucide-react";
import { CwRefreshButton } from "@/components/cw/CwRefreshButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notice } from "@/lib/notice";
import { errorMessage, hubFetch, type GraphResponse, type HubView, type KnowledgeItem, type WorkspaceSettings } from "@/components/knowledge/hub/hub-client";
import { KnowledgeWorkspaceCard } from "@/components/knowledge/KnowledgeWorkspaceCard";
import { KnowledgeCategorySidebar } from "@/components/knowledge/hub/KnowledgeCategorySidebar";
import { KnowledgeCategoryManager } from "@/components/knowledge/hub/KnowledgeCategoryManager";
import { KnowledgeListView } from "@/components/knowledge/hub/KnowledgeListView";
import { KnowledgeTagCloud } from "@/components/knowledge/hub/KnowledgeTagCloud";
import { KnowledgeDetailDrawer } from "@/components/knowledge/hub/KnowledgeDetailDrawer";

const KnowledgeGraphView = dynamic(() => import("@/components/knowledge/hub/KnowledgeGraphView"), {
  ssr: false,
  loading: () => <div className="flex justify-center border border-[var(--cw-border)] bg-[var(--cw-panel)] py-24"><Loader2 className="h-6 w-6 animate-spin text-[var(--cw-accent)]" /></div>,
});

const REVIEW_MESSAGES: Record<string, string> = {
  "draft>reviewed": "검토 완료했습니다.",
  "reviewed>published": "지식을 공유 상태로 전환했습니다.",
  "reviewed>draft": "검토를 취소했습니다. Claude 검색에서 빠집니다.",
  "published>reviewed": "공유를 취소했습니다.",
};
const VIEWS: { id: HubView; label: string; hint: string; icon: typeof List }[] = [
  { id: "list", label: "목록", hint: "검토·분류 지정", icon: List },
  { id: "graph", label: "연결 그래프", hint: "옵시디언처럼 지식 연결 보기", icon: Share2 },
  { id: "cloud", label: "워드 클라우드", hint: "태그 빈도 한눈에 보기", icon: Cloud },
];
const EMPTY_GRAPH: GraphResponse = { nodes: [], edges: [], tags: [], categories: [], uncategorized: 0, needsEnrich: 0, truncated: false };

type BatchResult = { total: number; succeeded: number; failed: number; firstError: string | null };

export function KnowledgeHubSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const view: HubView = requestedView === "graph" || requestedView === "cloud" ? requestedView : "list";
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [graph, setGraph] = useState<GraphResponse>(EMPTY_GRAPH);
  const [hubError, setHubError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const closeDetail = useCallback(() => setDetailId(null), []);

  const setParams = useCallback((patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (tag) params.set("tag", tag);
      setItems((await hubFetch<{ items: KnowledgeItem[] }>(`/api/knowledge?${params}`, undefined, "지식을 읽지 못했습니다.")).items || []);
    } catch (error) { notice.error(errorMessage(error, "지식을 읽지 못했습니다.")); }
    finally { setLoading(false); }
  }, [query, status, category, tag]);

  const loadGraph = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (tag) params.set("tag", tag);
      setGraph(await hubFetch<GraphResponse>(`/api/knowledge/graph?${params}`, undefined, "분류·연결 정보를 읽지 못했습니다."));
      setHubError(null);
    } catch (error) { setGraph(EMPTY_GRAPH); setHubError(errorMessage(error, "분류·연결 정보를 읽지 못했습니다.")); }
  }, [status, category, tag]);

  useEffect(() => { const timer = setTimeout(() => void loadItems(), 180); return () => clearTimeout(timer); }, [loadItems]);
  useEffect(() => { const timer = setTimeout(() => void loadGraph(), 0); return () => clearTimeout(timer); }, [loadGraph]);
  useEffect(() => {
    let alive = true;
    hubFetch<WorkspaceSettings>("/api/workspace", undefined, "워크스페이스 정보를 읽지 못했습니다.")
      .then((next) => { if (alive) setWorkspace(next); })
      .catch((error) => notice.error(errorMessage(error, "워크스페이스 정보를 읽지 못했습니다.")));
    return () => { alive = false; };
  }, []);
  const reloadAll = useCallback(() => { void loadItems(); void loadGraph(); }, [loadItems, loadGraph]);

  const onItemChanged = useCallback((item?: KnowledgeItem) => {
    if (item) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...item } : entry));
    void loadGraph();
  }, [loadGraph]);

  const review = async (item: KnowledgeItem, next: string) => {
    try {
      const body = await hubFetch<{ item: KnowledgeItem }>(`/api/knowledge/${item.id}`, { method: "PATCH", body: { status: next, visibility: next === "published" ? "workspace" : undefined } }, "상태 변경에 실패했습니다.");
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...body.item } : entry));
      notice.success(REVIEW_MESSAGES[`${item.status}>${next}`] || "상태를 변경했습니다.");
      void loadGraph();
      return body.item;
    } catch (error) { notice.error(errorMessage(error, "상태 변경에 실패했습니다.")); return null; }
  };
  const remove = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    try {
      await hubFetch(`/api/knowledge/${target.id}`, { method: "DELETE" }, "삭제에 실패했습니다.");
      setItems((current) => current.filter((entry) => entry.id !== target.id));
      setDetailId((current) => current === target.id ? null : current);
      notice.success("지식함에서 제거했습니다.");
      void loadGraph();
    } catch (error) { notice.error(errorMessage(error, "삭제에 실패했습니다.")); }
  };
  const bulkAssign = async (itemIds: string[], categoryId: string | null) => {
    try {
      await hubFetch("/api/knowledge/bulk-category", { method: "POST", body: { itemIds, categoryId } }, "분류를 지정하지 못했습니다.");
      notice.success(`${itemIds.length}건의 분류를 바꿨습니다.`);
      reloadAll();
      return true;
    } catch (error) { notice.error(errorMessage(error, "분류를 지정하지 못했습니다.")); return false; }
  };
  const runBatch = async () => {
    setBatchRunning(true);
    try {
      const result = await hubFetch<BatchResult>("/api/knowledge/enrich/batch", { method: "POST" }, "AI 정리에 실패했습니다.");
      if (result.total === 0) notice.info("정리할 지식이 없습니다.");
      else if (result.failed === 0) notice.success(`AI 정리를 마쳤습니다. ${result.succeeded}건`);
      else notice.error(`AI 정리 ${result.succeeded}건 성공, ${result.failed}건 실패. ${result.firstError || ""}`.trim());
      reloadAll();
    } catch (error) { notice.error(errorMessage(error, "AI 정리에 실패했습니다.")); }
    finally { setBatchRunning(false); }
  };

  const detailInitial = detailId ? items.find((entry) => entry.id === detailId) || null : null;
  const categoryName = category === "none" ? "미분류" : graph.categories.find((entry) => entry.id === category)?.name;

  return <section className="space-y-6">
    {workspace && <KnowledgeWorkspaceCard key={workspace.workspace.id} settings={workspace} onChange={setWorkspace} />}
    <div className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--cw-accent)]">Knowledge workspace</p>
          <h2 className="mt-3 font-serif text-3xl">지식함</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--cw-body)]">모인 지식을 AI가 분류·태그·연결로 정리합니다. 분류는 직접 고치고 합칠 수 있고, 검토된 지식만 Claude MCP로 공유됩니다.</p>
        </div>
        <Brain className="hidden h-12 w-12 text-[var(--cw-accent)] md:block" />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-3"><Search className="h-4 w-4 shrink-0 text-[var(--cw-muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목·요약·원문 검색" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="상태" className="border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-3 text-sm"><option value="">전체 상태</option><option value="draft">초안</option><option value="reviewed">검토됨</option><option value="published">공유됨</option></select>
        <button type="button" onClick={() => void runBatch()} disabled={batchRunning || Boolean(hubError)} className="inline-flex items-center justify-center gap-1.5 border border-[var(--cw-accent)] px-4 py-3 text-sm font-semibold text-[var(--cw-accent)] hover:bg-[var(--cw-accent)] hover:text-white disabled:opacity-50">
          {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {batchRunning ? "AI 정리 중…" : `AI 정리${graph.needsEnrich ? ` (미정리 ${graph.needsEnrich}건)` : ""}`}
        </button>
        <CwRefreshButton onRefresh={reloadAll} loading={loading} label="지식 목록 새로고침" />
      </div>
      {batchRunning && <p className="mt-3 text-xs text-[var(--cw-muted)]">최대 20건을 순서대로 정리합니다. 몇 분 걸릴 수 있습니다.</p>}
      <div role="tablist" aria-label="보기" className="mt-5 grid grid-cols-3 gap-2">
        {VIEWS.map(({ id, label, hint, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setParams({ view: id === "list" ? "" : id })}
          className={`flex items-center gap-3 border px-4 py-3 text-left transition ${view === id ? "border-[var(--cw-accent)] bg-[var(--cw-accent)] text-white" : "border-[var(--cw-border)] bg-[var(--cw-paper)] text-[var(--cw-ink)] hover:border-[var(--cw-accent)]"}`}>
          <Icon className="h-5 w-5 shrink-0" />
          <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className={`hidden truncate text-xs sm:block ${view === id ? "text-white/80" : "text-[var(--cw-muted)]"}`}>{hint}</span></span>
        </button>)}
      </div>
    </div>

    {hubError && <div className="flex items-start gap-3 border border-amber-500 bg-[var(--cw-panel)] px-4 py-3 text-sm text-[var(--cw-body)]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p>{hubError}</p></div>}

    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <KnowledgeCategorySidebar categories={graph.categories} uncategorized={graph.uncategorized} selected={category} onSelect={(id) => setParams({ category: id })} onManage={() => setManagerOpen(true)} />
      </aside>
      <div className="min-w-0 space-y-4">
        {(categoryName || tag) && <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--cw-muted)]">필터</span>
          {categoryName && <button type="button" onClick={() => setParams({ category: "" })} className="inline-flex items-center gap-1 border border-[var(--cw-border)] px-2 py-1.5 text-xs text-[var(--cw-ink)]">분류: {categoryName}<X className="h-3 w-3" /></button>}
          {tag && <button type="button" onClick={() => setParams({ tag: "" })} className="inline-flex items-center gap-1 border border-[var(--cw-border)] px-2 py-1.5 text-xs text-[var(--cw-ink)]">#{tag}<X className="h-3 w-3" /></button>}
        </div>}

        {view === "graph" && <KnowledgeGraphView graph={graph} activeId={detailId} onOpen={setDetailId} />}
        {view === "cloud" && <KnowledgeTagCloud tags={graph.tags} selected={tag} onSelect={(next) => setParams({ tag: next, view: next ? "" : "cloud" })} />}
        {view === "list" && (loading || items.length > 0
          ? <KnowledgeListView items={items} categories={graph.categories} activeId={detailId} loading={loading} onOpen={setDetailId} onBulkAssign={bulkAssign} />
          : <div className="border border-dashed border-[var(--cw-border)] bg-[var(--cw-panel)] px-6 py-20 text-center"><Sparkles className="mx-auto h-8 w-8 text-[var(--cw-accent)]" /><p className="mt-4 font-serif text-xl">{category || tag || query || status ? "조건에 맞는 지식이 없습니다." : "아직 구조화된 지식이 없습니다."}</p><p className="mt-2 text-sm text-[var(--cw-muted)]">{category || tag || query || status ? "필터를 풀거나 다른 분류를 골라 보세요." : "Tiro 관리 화면에서 노트를 동기화한 뒤 지식화를 시작하세요."}</p></div>)}
      </div>
    </div>

    {detailId && <KnowledgeDetailDrawer key={detailId} itemId={detailId} initial={detailInitial} categories={graph.categories} canReview={workspace?.canReview ?? false} onClose={closeDetail} onOpenItem={setDetailId} onChanged={onItemChanged} onReview={review} onDelete={setDeleteTarget} />}
    {managerOpen && <KnowledgeCategoryManager categories={graph.categories} onClose={() => setManagerOpen(false)} onChanged={reloadAll} />}
    <ConfirmDialog isOpen={deleteTarget !== null} title="지식함에서 제거" message={`"${deleteTarget?.title || ""}" 지식을 삭제합니다. Claude 검색에서도 빠지며 되돌릴 수 없습니다. 원본 Tiro 노트는 남아 있어 다시 지식화할 수 있습니다.`} confirmText="제거" cancelText="취소" type="danger" onConfirm={() => void remove()} onCancel={() => setDeleteTarget(null)} />
  </section>;
}
