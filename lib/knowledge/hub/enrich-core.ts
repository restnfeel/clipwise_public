import { parseAgentJson } from "@/lib/llm/chat";
import {
  AI_CATEGORY_LIMIT,
  ENRICH_BODY_MAX,
  ENRICH_RELATED_MAX,
  ENRICH_TOPICS_MAX,
  LINK_MIN_SCORE,
  type CategoryDecision,
  type CategoryOrigin,
  type EnrichItemInput,
  type EnrichNeighbor,
  type EnrichParsed,
} from "@/lib/knowledge/hub/types";

type CategoryRef = { id: string; name: string; description: string | null };
type AiCategoryResult = { status: string; choice?: string; confidence?: number; probabilities?: Record<string, number> };

const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function normalizeCategoryName(value: string): { name: string; key: string } | null {
  const name = value.replace(/^[#\s"'「『]+|["'」』\s]+$/g, "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 12) return null;
  return { name, key: name.toLowerCase().replace(/\s+/g, "") };
}

export function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function buildEnrichPrompt(item: EnrichItemInput, categories: CategoryRef[], neighbors: EnrichNeighbor[]) {
  const system = [
    "너는 팀 지식함을 정리하는 편집자다. 주어진 지식 1건을 읽고 정리 결과를 JSON으로만 답한다.",
    "원본에 없는 사실을 만들지 않는다. 모든 값은 한국어로 쓴다.",
    `응답 형식: {"summary": string(3~5문장), "topics": string[](핵심 주제어 ${ENRICH_TOPICS_MAX}개 이하, 2~10자 명사), "entities": [{"name": string, "type": "person"|"org"|"place"|"concept"|"event"}], "decisions": string[], "actionItems": [{"task": string, "owner": string|null}], "newCategory": {"name": string, "description": string}|null, "related": [{"id": string, "reason": string}]}`,
    "newCategory: 이 지식이 들어갈 넓은 분류 이름(2~12자 명사구)과 한 줄 설명. 기존 분류 중 맞는 것이 있으면 그 이름을 그대로 쓴다. 너무 잘게 나누지 않는다.",
    `related: 아래 '다른 지식' 목록에 있는 id만 쓴다. 내용상 실제로 이어지는 것만 최대 ${ENRICH_RELATED_MAX}개, 이유는 한 줄.`,
  ].join("\n");
  const user = [
    `## 기존 분류\n${categories.length ? categories.map((category) => `- ${category.name}${category.description ? `: ${category.description}` : ""}`).join("\n") : "(없음)"}`,
    `## 다른 지식\n${neighbors.length ? neighbors.map((neighbor) => `- ${neighbor.id} | ${neighbor.title}${neighbor.topics.length ? ` | ${neighbor.topics.join(", ")}` : ""}`).join("\n") : "(없음)"}`,
    `## 정리할 지식\n제목: ${item.title}\n기존 요약: ${item.summary || "(없음)"}\n본문:\n${item.body.slice(0, ENRICH_BODY_MAX)}`,
  ].join("\n\n");
  return { system, user };
}

export function parseEnrichResponse(text: string, neighborIds: string[]): EnrichParsed {
  const raw = parseAgentJson(text, "AI 정리 응답");
  const summary = clean(raw.summary, 2_000);
  if (!summary) throw new Error("AI 정리 응답에 요약이 없습니다.");
  const list = (value: unknown) => Array.isArray(value) ? value : [];
  const topics: string[] = [];
  for (const topic of list(raw.topics)) {
    const value = clean(topic, 30).replace(/^#+/, "").trim();
    if (value && !topics.includes(value)) topics.push(value);
    if (topics.length >= ENRICH_TOPICS_MAX) break;
  }
  const entities = list(raw.entities).flatMap((entity) => {
    const record = entity as Record<string, unknown>;
    const name = clean(record?.name, 100);
    return name ? [{ name, type: clean(record.type, 20) || "concept" }] : [];
  }).slice(0, 10);
  const decisions = list(raw.decisions).map((value) => clean(value, 500)).filter(Boolean).slice(0, 20);
  const actionItems = list(raw.actionItems).flatMap((action) => {
    const record = action as Record<string, unknown>;
    const task = clean(record?.task, 500);
    return task ? [{ task, owner: clean(record.owner, 100) || null }] : [];
  }).slice(0, 20);
  const candidate = raw.newCategory as Record<string, unknown> | null | undefined;
  const normalized = candidate && typeof candidate.name === "string" ? normalizeCategoryName(candidate.name) : null;
  const newCategory = normalized ? { name: normalized.name, description: clean(candidate?.description, 300) } : null;
  const allowed = new Set(neighborIds);
  const related: { id: string; reason: string }[] = [];
  for (const entry of list(raw.related)) {
    const record = entry as Record<string, unknown>;
    const id = typeof record?.id === "string" ? record.id.trim() : "";
    if (!allowed.has(id) || related.some((value) => value.id === id)) continue;
    related.push({ id, reason: clean(record.reason, 300) });
    if (related.length >= ENRICH_RELATED_MAX) break;
  }
  return { summary, topics, entities, decisions, actionItems, newCategory, related };
}

export function buildCategoryQuestion(categories: CategoryRef[], candidate: { name: string; description: string } | null) {
  const keyMap: Record<string, string> = {};
  const criteria: Record<string, string> = {};
  categories.forEach((category, index) => {
    keyMap[`c${index}`] = category.id;
    criteria[`c${index}`] = category.description ? `${category.name}: ${category.description}` : category.name;
  });
  if (candidate) criteria.new = `새 분류 "${candidate.name}"${candidate.description ? `: ${candidate.description}` : ""} (기존 분류가 모두 맞지 않을 때)`;
  const questions = { criteria };
  return { questions, keyMap };
}

export function decideCategory(input: {
  item: { category_id: string | null; category_source: CategoryOrigin | null };
  categories: { id: string; name: string }[];
  keyMap: Record<string, string>;
  aiCategoryCount: number;
  aiCategory: AiCategoryResult;
  candidate: { name: string; description: string } | null;
}): CategoryDecision {
  if (input.item.category_source === "user") return { action: "keep" };
  const aiOk = input.aiCategory.status === "ok" && typeof input.aiCategory.choice === "string";
  const confidence = aiOk && typeof input.aiCategory.confidence === "number" ? input.aiCategory.confidence : null;
  if (aiOk && input.aiCategory.choice && input.keyMap[input.aiCategory.choice]) return { action: "assign", categoryId: input.keyMap[input.aiCategory.choice], confidence };

  const normalized = input.candidate ? normalizeCategoryName(input.candidate.name) : null;
  if (normalized) {
    const same = input.categories.find((category) => normalizeCategoryName(category.name)?.key === normalized.key);
    if (same) return { action: "assign", categoryId: same.id, confidence };
    if (input.aiCategoryCount < AI_CATEGORY_LIMIT) return { action: "create", name: normalized.name, description: input.candidate?.description || "", confidence };
  }
  if (aiOk) {
    let best: { key: string; score: number } | null = null;
    for (const [key, score] of Object.entries(input.aiCategory.probabilities || {})) {
      if (input.keyMap[key] && (!best || score > best.score)) best = { key, score };
    }
    if (best) return { action: "assign", categoryId: input.keyMap[best.key], confidence: best.score };
  }
  return { action: "none" };
}

export function filterLinkCandidates(itemId: string, candidates: { id: string; reason: string }[], scores: Record<string, number | undefined> | null, existingPairs: Set<string>) {
  const result: { from: string; to: string; reason: string; confidence: number | null }[] = [];
  for (const candidate of candidates) {
    if (candidate.id === itemId) continue;
    const key = pairKey(itemId, candidate.id);
    if (existingPairs.has(key) || result.some((link) => pairKey(link.from, link.to) === key)) continue;
    const score = scores ? scores[candidate.id] : null;
    if (scores && (typeof score !== "number" || score < LINK_MIN_SCORE)) continue;
    const [from, to] = itemId < candidate.id ? [itemId, candidate.id] : [candidate.id, itemId];
    result.push({ from, to, reason: candidate.reason, confidence: typeof score === "number" ? score : null });
  }
  return result;
}

export function mergeEnrichment(item: EnrichItemInput, parsed: EnrichParsed) {
  const updates: Record<string, unknown> = { summary: parsed.summary };
  if (item.topics_source !== "user" && parsed.topics.length) { updates.topics = parsed.topics; updates.topics_source = "ai"; }
  if (parsed.entities.length) updates.entities = parsed.entities;
  if (parsed.decisions.length) updates.decisions = parsed.decisions;
  if (parsed.actionItems.length) updates.action_items = parsed.actionItems;
  return updates;
}
