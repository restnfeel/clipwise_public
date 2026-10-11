"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, RefreshCw, X } from "lucide-react";
import { CwRefreshButton } from "@/components/cw/CwRefreshButton";
import { SourceCredentialsSection } from "@/components/sot/SourceCredentialsSection";
import { notice } from "@/lib/notice";

type TiroNote = { id: string; source_id?: string; title: string; content: string; summary: string | null; source_updated_at: string | null; knowledgeized?: boolean };

export function TiroNotesSection() {
  const [notes, setNotes] = useState<TiroNote[]>([]);
  const [selected, setSelected] = useState<TiroNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/tiro/notes", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Tiro 노트를 불러오지 못했습니다."); setNotes(body.notes || []); }
    catch (error) { notice.error(error instanceof Error ? error.message : "Tiro 노트를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const sync = async () => {
    setSyncing(true);
    try { const response = await fetch("/api/tiro/notes", { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Tiro 동기화에 실패했습니다."); notice.success(`Tiro 노트 ${body.sync?.upserted ?? 0}건을 동기화했습니다.`); await load(); }
    catch (error) { notice.error(error instanceof Error ? error.message : "Tiro 동기화에 실패했습니다."); }
    finally { setSyncing(false); }
  };
  const knowledgeize = async (noteId: string) => {
    setBusyId(noteId);
    try { const response = await fetch(`/api/tiro/notes/knowledgeize?noteId=${encodeURIComponent(noteId)}`, { method: "POST" }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "지식화에 실패했습니다."); setNotes((current) => current.map((note) => note.id === noteId ? { ...note, knowledgeized: true } : note)); notice.success("검토 가능한 지식 draft로 저장했습니다."); }
    catch (error) { notice.error(error instanceof Error ? error.message : "지식화에 실패했습니다."); }
    finally { setBusyId(null); }
  };
  return <section className="space-y-6">
    <section className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--cw-accent)]">SOT · Tiro</p><h2 className="mt-3 font-serif text-2xl">Tiro 연결</h2><p className="mt-2 text-sm leading-6 text-[var(--cw-body)]">내 Tiro 노트를 읽고, 필요한 항목만 검토 가능한 지식 draft로 변환합니다.</p><div className="mt-5"><SourceCredentialsSection providerId="tiro" /></div></section>
    <section className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--cw-accent)]">Tiro · Notes</p><h2 className="mt-3 font-serif text-3xl">내 노트</h2><p className="mt-3 text-sm leading-7 text-[var(--cw-body)]">동기화된 원문은 내 workspace 범위에서만 표시됩니다.</p></div><div className="flex gap-2"><button type="button" onClick={() => void sync()} disabled={syncing || loading} className="inline-flex items-center gap-2 border border-[var(--cw-accent)] px-4 py-3 text-sm font-semibold text-[var(--cw-accent)] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> 동기화</button><CwRefreshButton onRefresh={() => void load()} loading={loading} label="Tiro 노트 새로고침" /></div></div>{loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--cw-accent)]" /></div> : notes.length === 0 ? <p className="py-16 text-center text-sm text-[var(--cw-muted)]">저장된 Tiro 노트가 없습니다.</p> : <ul className="mt-6 divide-y divide-[var(--cw-border)] border-y border-[var(--cw-border)]">{notes.map((note) => <li key={note.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="font-serif text-lg">{note.title}</h3><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-[var(--cw-body)]">{note.summary || note.content || "본문 없음"}</p><p className="mt-3 text-xs text-[var(--cw-muted)]">원본 수정: {note.source_updated_at || "미상"}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setSelected(note)} className="inline-flex items-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-[var(--cw-body)]"><Eye className="h-4 w-4" /> 상세</button><button type="button" onClick={() => void knowledgeize(note.id)} disabled={busyId === note.id || note.knowledgeized} className="border border-[var(--cw-accent)] px-3 py-2 text-xs font-semibold text-[var(--cw-accent)] disabled:opacity-50">{busyId === note.id ? "변환 중…" : note.knowledgeized ? "지식화 완료" : "지식화"}</button></div></li>)}</ul>}</section>
    {selected ? <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" role="presentation" onClick={() => setSelected(null)}><article className="max-h-[88vh] w-full max-w-4xl overflow-y-auto border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6 text-[var(--cw-ink)] shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cw-accent)]">Tiro · Original note</p><h2 className="mt-2 font-serif text-2xl">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="상세 닫기"><X className="h-5 w-5" /></button></header><p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-[var(--cw-body)]">{selected.content || "저장된 원문이 없습니다."}</p></article></div> : null}
  </section>;
}
