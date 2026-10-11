/** 지식 1건을 공개 아카이브 글(cw_blog_posts) 필드로 바꾼다. 순수 함수. */

export type ArchiveSourceItem = {
  title: string;
  summary: string | null;
  body: string | null;
  type: string | null;
  decisions: unknown;
  action_items: unknown;
  category?: { name: string } | null;
};

export type ArchivePostFields = { title: string; excerpt: string | null; category: string; content: string };

const TITLE_MAX = 200;
const EXCERPT_MAX = 300;
const DEFAULT_CATEGORY = "지식";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
}

function actionLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const lines: string[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { task, owner } = entry as { task?: unknown; owner?: unknown };
    if (typeof task !== "string" || !task.trim()) continue;
    lines.push(typeof owner === "string" && owner.trim() ? `- ${task.trim()} (담당: ${owner.trim()})` : `- ${task.trim()}`);
  }
  return lines;
}

export function buildArchivePost(item: ArchiveSourceItem): ArchivePostFields {
  const title = item.title.trim().slice(0, TITLE_MAX);
  const summary = item.summary?.trim() || "";
  const sections: string[] = [];
  if (summary) sections.push(`## 요약\n\n${summary}`);
  const decisions = stringList(item.decisions);
  if (decisions.length) sections.push(`## 핵심 결정\n\n${decisions.map((decision) => `- ${decision}`).join("\n")}`);
  const actions = actionLines(item.action_items);
  if (actions.length) sections.push(`## 할 일\n\n${actions.join("\n")}`);
  // 회의형 지식의 body는 원문 전사라 공개하지 않는다.
  const body = item.type === "document" ? item.body?.trim() : "";
  if (body) sections.push(`## 본문\n\n${body}`);
  return {
    title,
    excerpt: summary ? summary.slice(0, EXCERPT_MAX) : null,
    category: item.category?.name?.trim() || DEFAULT_CATEGORY,
    content: sections.length ? sections.join("\n\n") : title,
  };
}
