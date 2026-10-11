"use client";

import { Settings2, Sparkles } from "lucide-react";
import { categoryHex, UNCATEGORIZED_HEX } from "@/components/knowledge/hub/category-colors";
import type { KnowledgeCategory } from "@/components/knowledge/hub/hub-client";

type Props = {
  categories: KnowledgeCategory[];
  uncategorized: number;
  selected: string;
  onSelect: (categoryId: string) => void;
  onManage: () => void;
};

export function KnowledgeCategorySidebar({ categories, uncategorized, selected, onSelect, onManage }: Props) {
  const total = categories.reduce((sum, category) => sum + (category.count || 0), uncategorized);
  const row = (active: boolean) => `flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${active ? "bg-[var(--cw-paper)] font-semibold text-[var(--cw-ink)]" : "text-[var(--cw-body)] hover:bg-[var(--cw-paper)]"}`;
  return <nav aria-label="지식 분류" className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-3">
    <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--cw-accent)]">분류</p>
    <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      <button type="button" onClick={() => onSelect("")} className={`${row(selected === "")} shrink-0`}><span className="flex-1 truncate">전체</span><span className="text-xs text-[var(--cw-muted)]">{total}</span></button>
      {categories.map((category) => <button key={category.id} type="button" onClick={() => onSelect(category.id)} className={`${row(selected === category.id)} shrink-0`} title={category.description || category.name}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryHex(category.color) }} />
        <span className="flex-1 truncate">{category.name}</span>
        {category.origin === "ai" && <Sparkles className="h-3 w-3 shrink-0 text-[var(--cw-muted)]" aria-label="AI가 만든 분류" />}
        <span className="text-xs text-[var(--cw-muted)]">{category.count || 0}</span>
      </button>)}
      <button type="button" onClick={() => onSelect("none")} className={`${row(selected === "none")} shrink-0`}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ borderColor: UNCATEGORIZED_HEX }} />
        <span className="flex-1 truncate">미분류</span><span className="text-xs text-[var(--cw-muted)]">{uncategorized}</span>
      </button>
    </div>
    {categories.length === 0 && <p className="px-3 pt-3 text-xs leading-5 text-[var(--cw-muted)]">아직 분류가 없습니다. AI 정리를 실행하면 내용에 맞는 분류를 만듭니다.</p>}
    <button type="button" onClick={onManage} className="mt-3 inline-flex w-full items-center justify-center gap-1 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold text-[var(--cw-ink)] hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)]"><Settings2 className="h-3 w-3" /> 분류 관리</button>
  </nav>;
}
