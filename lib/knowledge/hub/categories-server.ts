import { supabaseAdmin } from "@/lib/supabase";
import { hubDbError, hubNotFound, KnowledgeHubError } from "@/lib/knowledge/hub/hub-http";
import { itemIdsInCategory, syncKnowledgeArchive } from "@/lib/knowledge/archive/archive-server";
import { CATEGORY_COLORS, type CategoryColor, type CategoryOrigin, type KnowledgeCategory } from "@/lib/knowledge/hub/types";

const CATEGORY_SELECT = "id,name,description,color,origin,sort_order";

export function categoryKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

function cleanUserName(value: unknown) {
  const name = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 40) throw new KnowledgeHubError("INVALID_NAME", "분류 이름은 1~40자로 입력하세요.");
  return name;
}

function cleanDescription(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new KnowledgeHubError("INVALID_DESCRIPTION", "분류 설명은 글자로 입력하세요.");
  const text = value.trim();
  if (text.length > 300) throw new KnowledgeHubError("INVALID_DESCRIPTION", "분류 설명은 300자 이내로 입력하세요.");
  return text || null;
}

const isColor = (value: unknown): value is CategoryColor => typeof value === "string" && (CATEGORY_COLORS as readonly string[]).includes(value);

/** 이름으로 분류를 찾는다(대소문자·띄어쓰기 무시). 지식함 SQL 적용 전이면 null. */
export async function findCategoryIdByName(workspaceIds: string[], name: string) {
  if (!workspaceIds.length) return null;
  const { data, error } = await supabaseAdmin.from("cw_knowledge_categories").select("id").in("workspace_id", workspaceIds).eq("name_key", categoryKey(name.replace(/^#/, "").trim())).limit(1).maybeSingle();
  if (error) { console.error("[knowledge-hub] 분류 이름 조회 실패", error.code); return null; }
  return data?.id || null;
}

export async function listCategories(workspaceId: string, options: { statuses?: string[] } = {}) {
  const [{ data: categories, error }, items] = await Promise.all([
    supabaseAdmin.from("cw_knowledge_categories").select(CATEGORY_SELECT).eq("workspace_id", workspaceId).order("sort_order").order("created_at"),
    (() => {
      let query = supabaseAdmin.from("cw_knowledge_items").select("category_id").eq("workspace_id", workspaceId).limit(5000);
      if (options.statuses?.length) query = query.in("status", options.statuses);
      return query;
    })(),
  ]);
  if (error) throw hubDbError(error, "분류 목록 조회");
  if (items.error) throw hubDbError(items.error, "분류 개수 조회");
  const counts = new Map<string, number>();
  let uncategorized = 0;
  for (const row of items.data || []) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) || 0) + 1);
    else uncategorized += 1;
  }
  return {
    categories: (categories || []).map((category) => ({ ...category, count: counts.get(category.id) || 0 })) as KnowledgeCategory[],
    uncategorized,
    total: (items.data || []).length,
  };
}

async function nextColor(workspaceId: string): Promise<CategoryColor> {
  const { data } = await supabaseAdmin.from("cw_knowledge_categories").select("color").eq("workspace_id", workspaceId);
  const used = new Map<string, number>();
  for (const row of data || []) used.set(row.color, (used.get(row.color) || 0) + 1);
  return [...CATEGORY_COLORS].sort((a, b) => (used.get(a) || 0) - (used.get(b) || 0))[0];
}

export async function countAiCategories(workspaceId: string) {
  const { count, error } = await supabaseAdmin.from("cw_knowledge_categories").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("origin", "ai");
  if (error) throw hubDbError(error, "AI 분류 개수 조회");
  return count || 0;
}

export async function getCategory(workspaceId: string, id: string) {
  const { data, error } = await supabaseAdmin.from("cw_knowledge_categories").select(CATEGORY_SELECT).eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  if (error) throw hubDbError(error, "분류 조회");
  if (!data) throw hubNotFound("분류를 찾을 수 없습니다.");
  return data as KnowledgeCategory;
}

export async function createCategory(workspaceId: string, userId: string | null, input: { name: unknown; description?: unknown; color?: unknown }, origin: CategoryOrigin) {
  const name = cleanUserName(input.name);
  const key = categoryKey(name);
  const row = {
    workspace_id: workspaceId, name, name_key: key, description: cleanDescription(input.description),
    color: isColor(input.color) ? input.color : await nextColor(workspaceId), origin, created_by: userId,
  };
  const { data, error } = await supabaseAdmin.from("cw_knowledge_categories").insert(row).select(CATEGORY_SELECT).single();
  if (error?.code === "23505") {
    if (origin === "user") throw new KnowledgeHubError("DUPLICATE", "같은 이름의 분류가 있습니다.", 409);
    const { data: existing } = await supabaseAdmin.from("cw_knowledge_categories").select(CATEGORY_SELECT).eq("workspace_id", workspaceId).eq("name_key", key).maybeSingle();
    if (existing) return existing as KnowledgeCategory;
  }
  if (error || !data) throw hubDbError(error, "분류 생성");
  return data as KnowledgeCategory;
}

export async function updateCategory(workspaceId: string, id: string, patch: Record<string, unknown>) {
  await getCategory(workspaceId, id);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) { updates.name = cleanUserName(patch.name); updates.name_key = categoryKey(updates.name as string); updates.origin = "user"; }
  if (patch.description !== undefined) { updates.description = cleanDescription(patch.description); updates.origin = "user"; }
  if (patch.color !== undefined) {
    if (!isColor(patch.color)) throw new KnowledgeHubError("INVALID_COLOR", "지원하지 않는 색입니다.");
    updates.color = patch.color;
  }
  if (patch.sortOrder !== undefined) {
    if (typeof patch.sortOrder !== "number" || !Number.isInteger(patch.sortOrder)) throw new KnowledgeHubError("INVALID_ORDER", "순서는 정수로 입력하세요.");
    updates.sort_order = patch.sortOrder;
  }
  const { data, error } = await supabaseAdmin.from("cw_knowledge_categories").update(updates).eq("workspace_id", workspaceId).eq("id", id).select(CATEGORY_SELECT).single();
  if (error?.code === "23505") throw new KnowledgeHubError("DUPLICATE", "같은 이름의 분류가 있습니다.", 409);
  if (error || !data) throw hubDbError(error, "분류 수정");
  if (patch.name !== undefined) await syncKnowledgeArchive(await itemIdsInCategory(workspaceId, id));
  return data as KnowledgeCategory;
}

export async function deleteCategory(workspaceId: string, id: string) {
  await getCategory(workspaceId, id);
  const affected = await itemIdsInCategory(workspaceId, id);
  const { error: clearError } = await supabaseAdmin.from("cw_knowledge_items").update({ category_id: null, category_source: null, category_confidence: null }).eq("workspace_id", workspaceId).eq("category_id", id);
  if (clearError) throw hubDbError(clearError, "분류 해제");
  const { error } = await supabaseAdmin.from("cw_knowledge_categories").delete().eq("workspace_id", workspaceId).eq("id", id);
  if (error) throw hubDbError(error, "분류 삭제");
  await syncKnowledgeArchive(affected);
}

export async function mergeCategory(workspaceId: string, fromId: string, toId: string) {
  if (fromId === toId) throw new KnowledgeHubError("SAME_CATEGORY", "같은 분류로는 합칠 수 없습니다.");
  const [from, to] = await Promise.all([getCategory(workspaceId, fromId), getCategory(workspaceId, toId)]);
  const affected = await itemIdsInCategory(workspaceId, from.id);
  const { error: moveError } = await supabaseAdmin.from("cw_knowledge_items").update({ category_id: to.id }).eq("workspace_id", workspaceId).eq("category_id", from.id);
  if (moveError) throw hubDbError(moveError, "분류 병합");
  const { error } = await supabaseAdmin.from("cw_knowledge_categories").delete().eq("workspace_id", workspaceId).eq("id", from.id);
  if (error) throw hubDbError(error, "병합한 분류 삭제");
  await syncKnowledgeArchive(affected);
  return to;
}

/** 지식 여러 건에 분류를 지정한다. 모든 id가 이 workspace 소속이어야 한다. */
export async function assignCategory(workspaceId: string, itemIds: string[], categoryId: string | null, source: CategoryOrigin, confidence: number | null = null) {
  const ids = Array.from(new Set(itemIds));
  if (!ids.length) return 0;
  if (categoryId) await getCategory(workspaceId, categoryId);
  const { data: owned, error: ownError } = await supabaseAdmin.from("cw_knowledge_items").select("id").eq("workspace_id", workspaceId).in("id", ids);
  if (ownError) throw hubDbError(ownError, "지식 확인");
  if ((owned || []).length !== ids.length) throw hubNotFound();
  const updates = categoryId
    ? { category_id: categoryId, category_source: source, category_confidence: source === "ai" ? confidence : null }
    : { category_id: null, category_source: source === "user" ? "user" : null, category_confidence: null };
  const { error } = await supabaseAdmin.from("cw_knowledge_items").update(updates).eq("workspace_id", workspaceId).in("id", ids);
  if (error) throw hubDbError(error, "분류 지정");
  await syncKnowledgeArchive(ids);
  return ids.length;
}
