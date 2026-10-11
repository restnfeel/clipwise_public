import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { chatCompletion, pickNewsletterAgent } from "@/lib/llm/chat";
import { buildCategoryQuestion, buildEnrichPrompt, decideCategory, filterLinkCandidates, mergeEnrichment, pairKey, parseEnrichResponse } from "@/lib/knowledge/hub/enrich-core";
import { assignCategory, countAiCategories, createCategory } from "@/lib/knowledge/hub/categories-server";
import { syncKnowledgeArchive } from "@/lib/knowledge/archive/archive-server";
import { existingPairs, saveSuggestedLinks } from "@/lib/knowledge/hub/links-server";
import { hubDbError, hubNotFound, KnowledgeHubError } from "@/lib/knowledge/hub/hub-http";
import { ENRICH_BATCH_MAX, ENRICH_NEIGHBOR_MAX, ENRICH_PROMPT_VERSION, KNOWLEDGE_ITEM_SELECT, type AiSignals, type EnrichItemInput, type EnrichParsed } from "@/lib/knowledge/hub/types";

const maskSecrets = (text: string) => text.replace(/(sk-|Bearer\s+)[^\s"']+/gi, "$1***");

async function generateEnrichment(item: EnrichItemInput, categories: { id: string; name: string; description: string | null }[], neighbors: { id: string; title: string; topics: string[] }[]) {
  const agent = pickNewsletterAgent();
  if (!agent) throw new KnowledgeHubError("AI_NOT_CONFIGURED", "AI 키가 설정되지 않아 정리하지 못했습니다.", 503);
  const prompt = buildEnrichPrompt(item, categories, neighbors);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await chatCompletion(agent, { ...prompt, temperature: 0.2 });
      return { parsed: parseEnrichResponse(result.content, neighbors.map((neighbor) => neighbor.id)), model: `${result.label}:${result.model}` };
    } catch (error) {
      lastError = maskSecrets(error instanceof Error ? error.message : "unknown");
    }
  }
  console.error("[knowledge-hub] AI 정리 실패", lastError);
  throw new KnowledgeHubError("AI_FAILED", "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도하세요.", 502);
}

async function linkScores(item: EnrichItemInput, parsed: EnrichParsed, neighbors: Map<string, string>) {
  void item; void neighbors;
  return { scores: parsed.related.length ? null : {} as Record<string, number | undefined>, status: "disabled" };
}

export async function enrichKnowledgeItem(workspaceId: string, itemId: string, actorUserId?: string | null) {
  const { data: item, error } = await supabaseAdmin.from("cw_knowledge_items").select("id,title,summary,body,topics,category_id,category_source,topics_source,status").eq("workspace_id", workspaceId).eq("id", itemId).maybeSingle();
  if (error) throw hubDbError(error, "지식 조회");
  if (!item) throw hubNotFound();
  const input = { ...item, topics: item.topics || [], body: item.body || "" } as EnrichItemInput & { status: string };

  const [{ data: categories, error: categoryError }, { data: neighborRows, error: neighborError }, pairs, aiCategoryCount] = await Promise.all([
    supabaseAdmin.from("cw_knowledge_categories").select("id,name,description,origin").eq("workspace_id", workspaceId).order("sort_order").order("created_at"),
    supabaseAdmin.from("cw_knowledge_items").select("id,title,topics").eq("workspace_id", workspaceId).neq("id", itemId).order("updated_at", { ascending: false }).limit(ENRICH_NEIGHBOR_MAX),
    existingPairs(workspaceId, itemId),
    countAiCategories(workspaceId),
  ]);
  if (categoryError) throw hubDbError(categoryError, "분류 조회");
  if (neighborError) throw hubDbError(neighborError, "다른 지식 조회");
  const neighbors = (neighborRows || []).map((row) => ({ id: row.id, title: row.title, topics: row.topics || [] }));

  const { parsed, model } = await generateEnrichment(input, categories || [], neighbors);

  const { keyMap } = buildCategoryQuestion(categories || [], parsed.newCategory);
  const decision = decideCategory({
    item: input, categories: categories || [], keyMap, aiCategoryCount,
    aiCategory: { status: "disabled" },
    candidate: parsed.newCategory,
  });
  let categoryName: string | null = null;
  if (decision.action === "create") {
    const created = await createCategory(workspaceId, null, { name: decision.name, description: decision.description }, "ai");
    await assignCategory(workspaceId, [itemId], created.id, "ai", decision.confidence);
    categoryName = created.name;
  } else if (decision.action === "assign") {
    await assignCategory(workspaceId, [itemId], decision.categoryId, "ai", decision.confidence);
    categoryName = (categories || []).find((category) => category.id === decision.categoryId)?.name || null;
  }

  const links = await linkScores(input, { ...parsed, related: parsed.related.filter((candidate) => !pairs.has(pairKey(itemId, candidate.id))) }, new Map(neighbors.map((neighbor) => [neighbor.id, neighbor.title])));
  const linksSuggested = await saveSuggestedLinks(workspaceId, filterLinkCandidates(itemId, parsed.related, links.scores, pairs));

  const updates = { ...mergeEnrichment(input, parsed), ai_enriched_at: new Date().toISOString(), ai_model: model, ai_prompt_version: ENRICH_PROMPT_VERSION, ai_signals: {} };
  const { data: saved, error: saveError } = await supabaseAdmin.from("cw_knowledge_items").update(updates).eq("workspace_id", workspaceId).eq("id", itemId).select(KNOWLEDGE_ITEM_SELECT).single();
  if (saveError || !saved) throw hubDbError(saveError, "AI 정리 결과 저장");
  const { error: eventError } = await supabaseAdmin.from("cw_knowledge_item_events").insert({
    workspace_id: workspaceId, knowledge_item_id: itemId, action: "ai_enrich", actor_user_id: actorUserId || null, source: "ai",
    from_status: input.status, to_status: input.status, metadata: { model, aiStatus: "model-only", linkStatus: links.status, categoryAction: decision.action, linksSuggested },
  });
  if (eventError) console.error("[knowledge-hub] AI 정리 이벤트 기록 실패", eventError.code);
  await syncKnowledgeArchive([itemId]);
  return { item: saved, categoryAction: decision.action, categoryName, linksSuggested, aiStatus: "model-only" };
}

export async function enrichBatch(workspaceId: string, actorUserId: string) {
  if (!pickNewsletterAgent()) throw new KnowledgeHubError("AI_NOT_CONFIGURED", "AI 키가 설정되지 않아 정리하지 못했습니다.", 503);
  const { data, error } = await supabaseAdmin.from("cw_knowledge_items").select("id").eq("workspace_id", workspaceId)
    .or("and(category_id.is.null,category_source.is.null),topics.eq.{}").order("updated_at", { ascending: false }).limit(ENRICH_BATCH_MAX);
  if (error) throw hubDbError(error, "정리 대상 조회");
  let succeeded = 0;
  const failures: string[] = [];
  for (const row of data || []) {
    try { await enrichKnowledgeItem(workspaceId, row.id, actorUserId); succeeded += 1; }
    catch (failure) { failures.push(failure instanceof KnowledgeHubError ? failure.message : "알 수 없는 오류"); }
  }
  return { total: (data || []).length, succeeded, failed: failures.length, firstError: failures[0] || null };
}

/** 새 지식이 생기면 응답 뒤에 AI 정리를 돌린다. 키가 없거나 요청 밖이면 조용히 건너뛴다. */
export function scheduleKnowledgeEnrich(workspaceId: string, itemId: string) {
  if (!pickNewsletterAgent()) return;
  const run = async () => {
    try { await enrichKnowledgeItem(workspaceId, itemId); }
    catch (error) { console.error("[knowledge-hub] 자동 정리 실패", error instanceof KnowledgeHubError ? error.code : error instanceof Error ? error.message : "unknown"); }
  };
  try { after(run); } catch { void run(); }
}
