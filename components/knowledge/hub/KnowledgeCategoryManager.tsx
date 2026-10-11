"use client";

import { useState } from "react";
import { GitMerge, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { CwDetailDrawer } from "@/components/cw/CwDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notice } from "@/lib/notice";
import { CATEGORY_COLOR_LABELS, CATEGORY_COLORS, categoryHex } from "@/components/knowledge/hub/category-colors";
import { errorMessage, hubFetch, type KnowledgeCategory } from "@/components/knowledge/hub/hub-client";

type Props = { categories: KnowledgeCategory[]; onClose: () => void; onChanged: () => void };
type Pending = { kind: "delete"; category: KnowledgeCategory } | { kind: "merge"; category: KnowledgeCategory; target: KnowledgeCategory };

const input = "min-w-0 border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--cw-accent)]";
const smallButton = "inline-flex items-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold";

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="분류 색">
    {CATEGORY_COLORS.map((color) => <button key={color} type="button" role="radio" aria-checked={value === color} aria-label={CATEGORY_COLOR_LABELS[color]} onClick={() => onChange(color)}
      className={`h-6 w-6 rounded-full border-2 ${value === color ? "border-[var(--cw-ink)]" : "border-transparent"}`} style={{ backgroundColor: categoryHex(color) }} />)}
  </div>;
}

function CategoryRow({ category, others, onSaved, onAsk }: { category: KnowledgeCategory; others: KnowledgeCategory[]; onSaved: () => void; onAsk: (pending: Pending) => void }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [color, setColor] = useState<string>(category.color);
  const [mergeTarget, setMergeTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = name !== category.name || description !== (category.description || "") || color !== category.color;
  const save = async () => {
    setSaving(true);
    try {
      await hubFetch(`/api/knowledge/categories/${category.id}`, { method: "PATCH", body: { name, description: description || null, color } }, "분류를 수정하지 못했습니다.");
      notice.success("분류를 수정했습니다.");
      onSaved();
    } catch (error) { notice.error(errorMessage(error, "분류를 수정하지 못했습니다.")); }
    finally { setSaving(false); }
  };
  const target = others.find((other) => other.id === mergeTarget);
  return <li className="space-y-3 border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
    <div className="flex items-center gap-2 text-xs text-[var(--cw-muted)]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryHex(color) }} />
      <span>지식 {category.count || 0}건</span>
      {category.origin === "ai" && <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI가 만든 분류 · 이름이나 설명을 바꾸면 사용자 분류가 됩니다</span>}
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr]">
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="분류 이름" className={input} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="설명(AI 분류 기준으로도 쓰입니다)" aria-label="분류 설명" className={input} />
    </div>
    <ColorPicker value={color} onChange={setColor} />
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onAsk({ kind: "delete", category })} className={`${smallButton} mr-auto text-red-600 hover:border-red-600`}><Trash2 className="h-3 w-3" /> 삭제</button>
      {others.length > 0 && <>
        <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} aria-label="합칠 대상 분류" className="border border-[var(--cw-border)] bg-[var(--cw-paper)] px-2 py-2 text-xs">
          <option value="">다른 분류로 합치기…</option>
          {others.map((other) => <option key={other.id} value={other.id}>{other.name}</option>)}
        </select>
        <button type="button" disabled={!target} onClick={() => target && onAsk({ kind: "merge", category, target })} className={`${smallButton} text-[var(--cw-ink)] disabled:opacity-40`}><GitMerge className="h-3 w-3" /> 합치기</button>
      </>}
      <button type="button" disabled={!dirty || saving || !name.trim()} onClick={() => void save()} className={`${smallButton} border-[var(--cw-accent)] bg-[var(--cw-accent)] text-white disabled:opacity-40`}><Save className="h-3 w-3" /> 저장</button>
    </div>
  </li>;
}

export function KnowledgeCategoryManager({ categories, onClose, onChanged }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const create = async () => {
    setCreating(true);
    try {
      await hubFetch("/api/knowledge/categories", { method: "POST", body: { name, color: color || undefined } }, "분류를 추가하지 못했습니다.");
      notice.success("분류를 추가했습니다.");
      setName(""); setColor("");
      onChanged();
    } catch (error) { notice.error(errorMessage(error, "분류를 추가하지 못했습니다.")); }
    finally { setCreating(false); }
  };
  const confirm = async () => {
    const current = pending;
    setPending(null);
    if (!current) return;
    try {
      if (current.kind === "delete") {
        await hubFetch(`/api/knowledge/categories/${current.category.id}`, { method: "DELETE" }, "분류를 삭제하지 못했습니다.");
        notice.success("분류를 삭제했습니다. 지식은 미분류로 옮겼습니다.");
      } else {
        await hubFetch(`/api/knowledge/categories/${current.category.id}/merge`, { method: "POST", body: { targetId: current.target.id } }, "분류를 합치지 못했습니다.");
        notice.success(`'${current.target.name}' 분류로 합쳤습니다.`);
      }
      onChanged();
    } catch (error) { notice.error(errorMessage(error, "분류를 변경하지 못했습니다.")); }
  };
  return <CwDetailDrawer eyebrow="지식함 · 분류" title="분류 관리" onClose={onClose}>
    <section className="space-y-3 border border-dashed border-[var(--cw-border)] p-4">
      <p className="text-xs font-semibold text-[var(--cw-ink)]">새 분류</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="분류 이름(1~40자)" aria-label="새 분류 이름" className={`${input} flex-1`} onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !e.nativeEvent.isComposing) void create(); }} />
        <button type="button" disabled={!name.trim() || creating} onClick={() => void create()} className={`${smallButton} justify-center border-[var(--cw-accent)] bg-[var(--cw-accent)] text-white disabled:opacity-40`}><Plus className="h-3 w-3" /> 추가</button>
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <p className="text-xs text-[var(--cw-muted)]">색을 고르지 않으면 가장 적게 쓴 색을 씁니다.</p>
    </section>
    {categories.length === 0
      ? <p className="text-sm text-[var(--cw-muted)]">아직 분류가 없습니다. AI 정리를 실행하면 AI가 내용에 맞는 분류를 만들고, 여기서 이름을 바꾸거나 합칠 수 있습니다.</p>
      : <ul className="space-y-3">{categories.map((category) => <CategoryRow key={`${category.id}:${category.name}:${category.color}:${category.description || ""}`} category={category} others={categories.filter((other) => other.id !== category.id)} onSaved={onChanged} onAsk={setPending} />)}</ul>}
    <ConfirmDialog
      isOpen={pending !== null}
      title={pending?.kind === "merge" ? "분류 합치기" : "분류 삭제"}
      message={pending?.kind === "merge"
        ? `'${pending.category.name}'의 지식 ${pending.category.count || 0}건을 '${pending.target.name}'(으)로 옮기고 '${pending.category.name}' 분류를 지웁니다.`
        : `'${pending?.category.name || ""}' 분류를 지웁니다. 이 분류의 지식 ${pending?.category.count || 0}건은 미분류가 되고, 지식 자체는 지워지지 않습니다.`}
      confirmText={pending?.kind === "merge" ? "합치기" : "삭제"}
      cancelText="취소"
      type="danger"
      onConfirm={() => void confirm()}
      onCancel={() => setPending(null)}
    />
  </CwDetailDrawer>;
}
