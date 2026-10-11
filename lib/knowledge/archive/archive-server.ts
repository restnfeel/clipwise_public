import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { BLOG_POSTS_TABLE } from "@/lib/blog/constants";
import { buildArchivePost, type ArchiveSourceItem } from "@/lib/knowledge/archive/archive-content";
import { KNOWLEDGE_ITEM_SELECT } from "@/lib/knowledge/hub/types";

export type ArchiveStatus = { slugid: string; status: string };

export class ArchiveError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

type ArchiveItem = ArchiveSourceItem & { id: string; workspace_id: string; status: string };
type DbError = { code?: string; message?: string } | null;

const POST_SELECT = "id,slugid,status,source_knowledge_item_id";

function isSchemaMissing(error: DbError) {
  return error?.code === "42703" || error?.code === "PGRST204" || /source_knowledge_item_id/.test(error?.message || "");
}

function schemaMissing() {
  return new ArchiveError("ARCHIVE_SCHEMA_MISSING", "아카이브 연결 설정이 필요합니다. 관리자에게 문의하세요.", 503);
}

export async function readArchiveItem(itemId: string, workspaceIds: string[]): Promise<ArchiveItem> {
  if (!workspaceIds.length) throw new ArchiveError("NOT_FOUND", "지식을 찾을 수 없습니다.", 404);
  const { data, error } = await supabaseAdmin.from("cw_knowledge_items").select(KNOWLEDGE_ITEM_SELECT).eq("id", itemId).in("workspace_id", workspaceIds).maybeSingle();
  if (error) throw new ArchiveError("DB_ERROR", "지식을 읽지 못했습니다.", 500);
  if (!data) throw new ArchiveError("NOT_FOUND", "지식을 찾을 수 없습니다.", 404);
  return data as unknown as ArchiveItem;
}

export async function archiveStatusFor(itemIds: string[]): Promise<Map<string, ArchiveStatus>> {
  const map = new Map<string, ArchiveStatus>();
  if (!itemIds.length) return map;
  const { data, error } = await supabaseAdmin.from(BLOG_POSTS_TABLE).select(POST_SELECT).in("source_knowledge_item_id", itemIds);
  if (error) {
    if (!isSchemaMissing(error)) console.error("[knowledge-archive] 공개 상태 조회 실패", error.code);
    return map;
  }
  for (const post of data || []) map.set(post.source_knowledge_item_id as string, { slugid: post.slugid as string, status: post.status as string });
  return map;
}

export async function publishToArchive(itemId: string, workspaceIds: string[], actorUserId: string | null): Promise<ArchiveStatus> {
  const item = await readArchiveItem(itemId, workspaceIds);
  if (item.status !== "published") throw new ArchiveError("NOT_PUBLISHED", "공유됨 상태인 지식만 아카이브에 공개할 수 있습니다.", 409);
  const fields = buildArchivePost(item);
  const now = new Date().toISOString();
  const { data: existing, error: findError } = await supabaseAdmin.from(BLOG_POSTS_TABLE).select(POST_SELECT).eq("source_knowledge_item_id", itemId).maybeSingle();
  if (isSchemaMissing(findError)) throw schemaMissing();
  if (findError) throw new ArchiveError("DB_ERROR", "아카이브에 공개하지 못했습니다.", 500);
  const values = { ...fields, status: "published", published_at: now, updated_at: now };
  const result = existing
    ? await supabaseAdmin.from(BLOG_POSTS_TABLE).update(values).eq("id", existing.id).select(POST_SELECT).single()
    : await supabaseAdmin.from(BLOG_POSTS_TABLE).insert({ ...values, slug: `knowledge-${itemId}`, slugid: randomUUID(), workspace_id: item.workspace_id, created_by: actorUserId, source_knowledge_item_id: itemId }).select(POST_SELECT).single();
  if (result.error || !result.data) {
    console.error("[knowledge-archive] 공개 실패", result.error?.code);
    throw new ArchiveError("DB_ERROR", "아카이브에 공개하지 못했습니다.", 500);
  }
  return { slugid: result.data.slugid as string, status: result.data.status as string };
}

export async function unpublishFromArchive(itemIds: string[]) {
  if (!itemIds.length) return;
  const { error } = await supabaseAdmin.from(BLOG_POSTS_TABLE).update({ status: "draft", published_at: null, updated_at: new Date().toISOString() }).in("source_knowledge_item_id", itemIds).eq("status", "published");
  if (error && !isSchemaMissing(error)) {
    console.error("[knowledge-archive] 내리기 실패", error.code);
    throw new ArchiveError("DB_ERROR", "아카이브에서 내리지 못했습니다.", 500);
  }
}

/** 지식 변경을 연결된 아카이브 글에 반영한다. 공유됨이 아니면 내리고, 공개 여부를 새로 켜지는 않는다. 실패는 로그만 남긴다. */
export async function syncKnowledgeArchive(itemIds: string[]) {
  const ids = Array.from(new Set(itemIds));
  if (!ids.length) return;
  try {
    const { data: posts, error } = await supabaseAdmin.from(BLOG_POSTS_TABLE).select(POST_SELECT).in("source_knowledge_item_id", ids);
    if (error) {
      if (!isSchemaMissing(error)) console.error("[knowledge-archive] 연결 글 조회 실패", error.code);
      return;
    }
    if (!posts?.length) return;
    const linkedIds = posts.map((post) => post.source_knowledge_item_id as string);
    const { data: items, error: itemError } = await supabaseAdmin.from("cw_knowledge_items").select(KNOWLEDGE_ITEM_SELECT).in("id", linkedIds);
    if (itemError) { console.error("[knowledge-archive] 지식 조회 실패", itemError.code); return; }
    const byId = new Map(((items || []) as unknown as ArchiveItem[]).map((item) => [item.id, item]));
    const withdraw = linkedIds.filter((id) => byId.get(id)?.status !== "published");
    if (withdraw.length) await unpublishFromArchive(withdraw);
    const now = new Date().toISOString();
    for (const id of linkedIds) {
      const item = byId.get(id);
      if (!item || item.status !== "published") continue;
      const { error: updateError } = await supabaseAdmin.from(BLOG_POSTS_TABLE).update({ ...buildArchivePost(item), updated_at: now }).eq("source_knowledge_item_id", id);
      if (updateError) console.error("[knowledge-archive] 글 갱신 실패", updateError.code);
    }
  } catch (error) {
    console.error("[knowledge-archive] 동기화 실패", error instanceof Error ? error.message : error);
  }
}

export async function itemIdsInCategory(workspaceId: string, categoryId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("cw_knowledge_items").select("id").eq("workspace_id", workspaceId).eq("category_id", categoryId);
  return (data || []).map((row) => row.id as string);
}
