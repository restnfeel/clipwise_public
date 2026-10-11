"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Globe, Loader2, ShieldAlert, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { CwDetailDrawer } from "@/components/cw/CwDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notice } from "@/lib/notice";
import { AI_CATEGORY_LIMIT, type AiSignals } from "@/lib/knowledge/hub/types";
import { categoryHex } from "@/components/knowledge/hub/category-colors";
import { errorMessage, hubFetch, STATUS_LABELS, type KnowledgeCategory, type KnowledgeItem } from "@/components/knowledge/hub/hub-client";
import { KnowledgeLinksSection } from "@/components/knowledge/hub/KnowledgeLinksSection";

type Props = {
  itemId: string;
  initial: KnowledgeItem | null;
  categories: KnowledgeCategory[];
  /** 이 워크스페이스의 검수 역할(또는 플랫폼 관리자)일 때만 아카이브 공개 버튼을 보인다. */
  canReview: boolean;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  onChanged: (item?: KnowledgeItem) => void;
  onReview: (item: KnowledgeItem, next: string) => Promise<KnowledgeItem | null>;
  onDelete: (item: KnowledgeItem) => void;
};

type EnrichResult = { item: KnowledgeItem; categoryAction: string; categoryName: string | null; linksSuggested: number; warning: string | null };

const PRIORITY_LABELS = ["낮음", "참고", "유용", "핵심"];
const sectionTitle = "text-xs font-semibold text-[var(--cw-ink)]";
const subtle = "inline-flex items-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-[var(--cw-muted)] hover:text-[var(--cw-ink)]";
const primary = "inline-flex items-center gap-1 border border-[var(--cw-accent)] bg-[var(--cw-accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50";

/** AI 점수는 0~1 비율 또는 1~4 단계로 올 수 있어 1~4로 맞춘다. */
function priorityLevel(score?: number) {
  if (typeof score !== "number") return null;
  const level = score <= 1 ? 1 + Math.round(score * 3) : Math.round(score);
  return Math.min(4, Math.max(1, level));
}

function AiBadges({ signals }: { signals?: AiSignals | null }) {
  if (!signals?.aiStatus) return null;
  if (signals.aiStatus !== "ok") return <p className="text-xs text-[var(--cw-muted)]">AI 보조 판정 정보 없이 정리된 지식입니다.</p>;
  const level = priorityLevel(signals.priority);
  const badge = "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold";
  return <div className="flex flex-wrap gap-2">
    {(signals.personalData ?? 0) >= 0.5 && <span className={`${badge} border-red-500 text-red-600`}><ShieldAlert className="h-3 w-3" /> 개인정보 주의</span>}
    {level && <span className={`${badge} border-[var(--cw-border)] text-[var(--cw-ink)]`}>보존 가치 {level}/4 · {PRIORITY_LABELS[level - 1]}</span>}
    {(signals.reviewRecommended ?? 0) >= 0.5 && <span className={`${badge} border-amber-500 text-amber-600`}>검토 권장</span>}
  </div>;
}

export function KnowledgeDetailDrawer({ itemId, initial, categories, canReview, onClose, onOpenItem, onChanged, onReview, onDelete }: Props) {
  const [item, setItem] = useState<KnowledgeItem | null>(initial);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [linksKey, setLinksKey] = useState(0);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  useEffect(() => {
    let alive = true;
    hubFetch<{ item: KnowledgeItem }>(`/api/knowledge/${itemId}`, undefined, "지식을 찾을 수 없습니다.")
      .then((body) => { if (alive) setItem(body.item); })
      .catch((error) => { if (alive) { notice.error(errorMessage(error, "지식을 찾을 수 없습니다.")); onClose(); } });
    return () => { alive = false; };
  }, [itemId, onClose]);

  if (!item) return <CwDetailDrawer eyebrow="지식" title="불러오는 중" onClose={onClose}><Loader2 className="h-5 w-5 animate-spin text-[var(--cw-accent)]" /></CwDetailDrawer>;

  const patch = async (body: Record<string, unknown>, success: string) => {
    setSaving(true);
    try {
      const result = await hubFetch<{ item: KnowledgeItem }>(`/api/knowledge/${item.id}`, { method: "PATCH", body }, "지식을 수정하지 못했습니다.");
      setItem(result.item); onChanged(result.item); notice.success(success);
    } catch (error) { notice.error(errorMessage(error, "지식을 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  const addTag = () => {
    const tag = tagDraft.replace(/^#+/, "").trim();
    if (!tag) return;
    if (item.topics.includes(tag)) { setTagDraft(""); return; }
    setTagDraft("");
    void patch({ topics: [...item.topics, tag] }, "태그를 추가했습니다.");
  };
  const enrich = async () => {
    setEnriching(true);
    try {
      const result = await hubFetch<EnrichResult>(`/api/knowledge/${item.id}/enrich`, { method: "POST" }, "AI 정리에 실패했습니다.");
      setItem(result.item); onChanged(result.item); setLinksKey((key) => key + 1);
      const parts = [`분류: ${result.categoryName || "변경 없음"}`, `연결 제안 ${result.linksSuggested}건`];
      notice.success(`AI 정리를 마쳤습니다. ${parts.join(" · ")}${result.warning ? ` (${result.warning})` : ""}`);
    } catch (error) { notice.error(errorMessage(error, "AI 정리에 실패했습니다.")); }
    finally { setEnriching(false); }
  };
  const setArchive = async (publish: boolean) => {
    setConfirmArchive(false);
    setArchiving(true);
    const fallback = publish ? "아카이브에 공개하지 못했습니다." : "아카이브에서 내리지 못했습니다.";
    try {
      const result = await hubFetch<{ archive: KnowledgeItem["archive"] }>(`/api/knowledge/${item.id}/archive`, { method: publish ? "POST" : "DELETE" }, fallback);
      const next = { ...item, archive: result.archive };
      setItem(next); onChanged(next);
      notice.success(publish ? "지식 아카이브에 공개했습니다." : "지식 아카이브에서 내렸습니다.");
    } catch (error) { notice.error(errorMessage(error, fallback)); }
    finally { setArchiving(false); }
  };
  const archived = item.archive?.status === "published";
  const review = async (next: string) => { const updated = await onReview(item, next); if (updated) setItem(updated); };

  const aiCategoryCount = categories.filter((category) => category.origin === "ai").length;
  const categoryNote = item.category_source === "user"
    ? "사용자 지정 · AI가 바꾸지 않습니다"
    : item.category_source === "ai" ? `AI 분류${typeof item.category_confidence === "number" ? ` · 신뢰도 ${Math.round(item.category_confidence * 100)}%` : ""}` : null;

  return <CwDetailDrawer
    eyebrow={`${item.source_system} · ${STATUS_LABELS[item.status] || item.status} · ${new Date(item.updated_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" })}`}
    title={item.title}
    onClose={onClose}
    footer={<>
      <button type="button" onClick={() => onDelete(item)} className="mr-auto inline-flex items-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-600"><Trash2 className="h-3 w-3" /> 지식함에서 제거</button>
      <button type="button" onClick={() => void enrich()} disabled={enriching} className={subtle}>{enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {enriching ? "AI 정리 중…" : "AI 정리"}</button>
      {item.status === "draft" && <button type="button" onClick={() => void review("reviewed")} className={primary}><Check className="h-3 w-3" /> 검토 완료로 표시</button>}
      {item.status === "reviewed" && <><button type="button" onClick={() => void review("draft")} className={subtle}><Undo2 className="h-3 w-3" /> 검토 취소</button><button type="button" onClick={() => void review("published")} className={primary}>Claude에 공유하기</button></>}
      {item.status === "published" && canReview && (archived
        ? <button type="button" onClick={() => void setArchive(false)} disabled={archiving} className={subtle}>{archiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />} 아카이브에서 내리기</button>
        : <button type="button" onClick={() => setConfirmArchive(true)} disabled={archiving} className={subtle}>{archiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />} 아카이브에 공개</button>)}
      {item.status === "published" && <button type="button" onClick={() => void review("reviewed")} className={subtle}><Undo2 className="h-3 w-3" /> 공유 취소</button>}
    </>}
  >
    {archived && item.archive && <a href={`/blog/${item.archive.slugid}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-[var(--cw-accent)] px-4 py-3 text-sm font-semibold text-[var(--cw-accent)] hover:bg-[var(--cw-panel)]"><Globe className="h-4 w-4" /> 지식 아카이브 공개 중<ExternalLink className="ml-auto h-4 w-4" /></a>}
    <section className="grid gap-4 border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4 md:grid-cols-[minmax(0,16rem)_1fr]">
      <div>
        <p className={sectionTitle}>분류</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryHex(item.category?.color) }} />
          <select value={item.category_id || ""} disabled={saving} onChange={(e) => void patch({ categoryId: e.target.value || null }, "분류를 바꿨습니다.")} aria-label="분류" className="min-w-0 flex-1 border border-[var(--cw-border)] bg-[var(--cw-paper)] px-2 py-2 text-sm">
            <option value="">미분류</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        {categoryNote && <p className="mt-1.5 text-xs text-[var(--cw-muted)]">{categoryNote}</p>}
        {aiCategoryCount >= AI_CATEGORY_LIMIT && item.category_source !== "user" && <p className="mt-1 text-xs text-[var(--cw-muted)]">AI 분류 한도({AI_CATEGORY_LIMIT}개)에 도달해 새 분류는 만들지 않습니다.</p>}
      </div>
      <div>
        <p className={sectionTitle}>태그{item.topics_source === "user" ? " · 사용자 지정" : item.topics_source === "ai" ? " · AI 추출" : ""}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.topics.map((topic) => <span key={topic} className="inline-flex items-center gap-1 bg-[var(--cw-paper)] px-2 py-1 text-xs text-[var(--cw-ink)]">#{topic}<button type="button" disabled={saving} onClick={() => void patch({ topics: item.topics.filter((value) => value !== topic) }, "태그를 지웠습니다.")} aria-label={`${topic} 태그 지우기`} className="text-[var(--cw-muted)] hover:text-red-600"><X className="h-3 w-3" /></button></span>)}
          <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} disabled={saving} maxLength={30} placeholder="+ 태그" aria-label="태그 추가"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addTag(); } }}
            className="w-28 border border-dashed border-[var(--cw-border)] bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--cw-accent)]" />
        </div>
      </div>
      <div className="md:col-span-2"><AiBadges signals={item.ai_signals} /></div>
    </section>
    {item.summary && <section><p className={sectionTitle}>요약</p><p className="mt-2 whitespace-pre-wrap">{item.summary}</p></section>}
    <KnowledgeLinksSection itemId={item.id} refreshKey={linksKey} onOpenItem={onOpenItem} onChanged={() => onChanged()} />
    {item.decisions?.length > 0 && <section><p className={sectionTitle}>결정</p><ul className="mt-2 list-disc space-y-1 pl-5">{item.decisions.map((value) => <li key={value}>{value}</li>)}</ul></section>}
    {item.action_items?.length > 0 && <section><p className={sectionTitle}>할 일</p><ul className="mt-2 space-y-1">{item.action_items.map((value) => <li key={value.task}>□ {value.task}{value.owner ? ` · ${value.owner}` : ""}</li>)}</ul></section>}
    <ConfirmDialog isOpen={confirmArchive} title="지식 아카이브에 공개" message={`"${item.title}" 지식을 로그인 없이 누구나 볼 수 있는 지식 아카이브에 공개합니다. 요약·결정·할 일이 실리고, 회의 원문은 싣지 않습니다. 공유를 취소하면 아카이브에서도 내려갑니다.`} confirmText="공개" cancelText="취소" onConfirm={() => void setArchive(true)} onCancel={() => setConfirmArchive(false)} />
    <section><p className={sectionTitle}>원문</p><p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[var(--cw-border)] pl-4">{item.body || "원문이 없습니다."}</p></section>
  </CwDetailDrawer>;
}
