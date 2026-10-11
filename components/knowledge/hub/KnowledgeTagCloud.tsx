"use client";

import { Tags } from "lucide-react";

type Props = { tags: { tag: string; count: number }[]; selected: string; onSelect: (tag: string) => void };

const MIN_SIZE = 0.8;
const MAX_SIZE = 2.2;

export function KnowledgeTagCloud({ tags, selected, onSelect }: Props) {
  if (!tags.length) {
    return <div className="border border-dashed border-[var(--cw-border)] bg-[var(--cw-panel)] px-6 py-16 text-center text-sm text-[var(--cw-muted)]"><Tags className="mx-auto mb-3 h-6 w-6 text-[var(--cw-accent)]" />표시할 태그가 없습니다. AI 정리를 실행하거나 상세에서 태그를 추가하세요.</div>;
  }
  const max = tags[0].count;
  const min = tags[tags.length - 1].count;
  const sizeOf = (count: number) => max === min ? 1.2 : MIN_SIZE + ((count - min) / (max - min)) * (MAX_SIZE - MIN_SIZE);
  const ordered = [...tags].sort((a, b) => a.tag.localeCompare(b.tag, "ko"));
  return <div className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6">
    <p className="text-xs text-[var(--cw-muted)]">글자 크기는 태그가 붙은 지식 수입니다. 누르면 그 태그의 지식만 목록으로 봅니다.</p>
    <div className="mt-5 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-3">
      {ordered.map(({ tag, count }) => <button key={tag} type="button" onClick={() => onSelect(selected === tag ? "" : tag)} title={`${tag} · ${count}건`}
        className={`font-serif leading-tight transition hover:text-[var(--cw-accent)] ${selected === tag ? "text-[var(--cw-accent)] underline underline-offset-4" : "text-[var(--cw-ink)]"}`}
        style={{ fontSize: `${sizeOf(count).toFixed(2)}rem`, opacity: 0.55 + 0.45 * (sizeOf(count) - MIN_SIZE) / (MAX_SIZE - MIN_SIZE) }}>
        #{tag}
      </button>)}
    </div>
  </div>;
}
