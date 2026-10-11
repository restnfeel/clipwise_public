"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Link2, Loader2, Search, Sparkles, Unlink, X } from "lucide-react";
import { notice } from "@/lib/notice";
import { categoryHex } from "@/components/knowledge/hub/category-colors";
import { errorMessage, hubFetch, type ItemLink, type KnowledgeItem } from "@/components/knowledge/hub/hub-client";

type Props = { itemId: string; refreshKey: number; onOpenItem: (id: string) => void; onChanged: () => void };

const smallButton = "inline-flex items-center gap-1 border border-[var(--cw-border)] px-2 py-1 text-xs font-semibold";

export function KnowledgeLinksSection({ itemId, refreshKey, onOpenItem, onChanged }: Props) {
  const [links, setLinks] = useState<ItemLink[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try { setLinks((await hubFetch<{ links: ItemLink[] }>(`/api/knowledge/${itemId}/links`, undefined, "연결을 읽지 못했습니다.")).links); }
    catch (error) { setLinks([]); notice.error(errorMessage(error, "연결을 읽지 못했습니다.")); }
  }, [itemId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load, refreshKey]);

  const term = query.trim();
  useEffect(() => {
    if (!term) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults((await hubFetch<{ items: KnowledgeItem[] }>(`/api/knowledge?${new URLSearchParams({ q: term, limit: "8" })}`)).items.filter((item) => item.id !== itemId)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [term, itemId]);
  const visibleResults = term ? results : [];

  const act = async (run: () => Promise<unknown>, success: string, failure: string) => {
    try { await run(); notice.success(success); await load(); onChanged(); }
    catch (error) { notice.error(errorMessage(error, failure)); }
  };
  const setStatus = (link: ItemLink, status: "accepted" | "rejected") => act(() => hubFetch(`/api/knowledge/links/${link.id}`, { method: "PATCH", body: { status } }), status === "accepted" ? "연결을 확정했습니다." : "제안을 거절했습니다. 다시 제안하지 않습니다.", "연결을 바꾸지 못했습니다.");
  const remove = (link: ItemLink) => act(() => hubFetch(`/api/knowledge/links/${link.id}`, { method: "DELETE" }), "연결을 끊었습니다.", "연결을 끊지 못했습니다.");
  const connect = (target: KnowledgeItem) => act(async () => { await hubFetch("/api/knowledge/links", { method: "POST", body: { itemId, targetId: target.id } }); setQuery(""); }, `'${target.title}'와 연결했습니다.`, "연결하지 못했습니다.");

  const accepted = (links || []).filter((link) => link.status === "accepted");
  const suggested = (links || []).filter((link) => link.status === "suggested");
  const linkTitle = (link: ItemLink) => <button type="button" onClick={() => onOpenItem(link.other.id)} className="inline-flex min-w-0 items-center gap-1.5 text-left font-semibold text-[var(--cw-ink)] hover:text-[var(--cw-accent)]">
    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryHex(link.other.category?.color) }} /><span className="truncate">{link.other.title}</span>
  </button>;

  return <section>
    <p className="text-xs font-semibold text-[var(--cw-ink)]">연결된 지식</p>
    {links === null ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-[var(--cw-accent)]" /> : <div className="mt-2 space-y-4">
      {accepted.length === 0 && suggested.length === 0 && <p className="text-xs text-[var(--cw-muted)]">아직 연결이 없습니다. AI 정리를 실행하면 관련 지식을 제안하고, 아래에서 직접 연결할 수도 있습니다.</p>}
      {accepted.length > 0 && <ul className="space-y-1.5">{accepted.map((link) => <li key={link.id} className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--cw-accent)]" />{linkTitle(link)}<button type="button" onClick={() => void remove(link)} className={`${smallButton} ml-auto text-[var(--cw-muted)] hover:text-red-600`} aria-label="연결 끊기"><Unlink className="h-3 w-3" /></button></li>)}</ul>}
      {suggested.length > 0 && <div className="space-y-2 border-l-2 border-dashed border-[var(--cw-accent)] pl-3">
        <p className="inline-flex items-center gap-1 text-xs text-[var(--cw-muted)]"><Sparkles className="h-3 w-3" /> AI 제안 연결</p>
        {suggested.map((link) => <div key={link.id} className="space-y-1">
          <div className="flex items-center gap-2">{linkTitle(link)}{link.confidence !== null && <span className="shrink-0 text-[11px] text-[var(--cw-muted)]">AI {Math.round(link.confidence * 100)}%</span>}
            <span className="ml-auto flex shrink-0 gap-1"><button type="button" onClick={() => void setStatus(link, "accepted")} className={`${smallButton} text-[var(--cw-accent)]`}><Check className="h-3 w-3" /> 수락</button><button type="button" onClick={() => void setStatus(link, "rejected")} className={`${smallButton} text-[var(--cw-muted)]`}><X className="h-3 w-3" /> 거절</button></span>
          </div>
          {link.reason && <p className="text-xs leading-5 text-[var(--cw-muted)]">{link.reason}</p>}
        </div>)}
      </div>}
      <div className="relative">
        <label className="flex items-center gap-2 border border-[var(--cw-border)] bg-[var(--cw-panel)] px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-[var(--cw-muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="지식 연결하기 — 제목으로 검색" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />{searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cw-muted)]" />}</label>
        {visibleResults.length > 0 && <ul className="mt-1 max-h-56 overflow-y-auto border border-[var(--cw-border)] bg-[var(--cw-paper)]">{visibleResults.map((result) => <li key={result.id}><button type="button" onClick={() => void connect(result)} className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-[var(--cw-panel)]">{result.title}</button></li>)}</ul>}
      </div>
    </div>}
  </section>;
}
