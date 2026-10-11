import { supabaseAdmin } from "@/lib/supabase";
import { pairKey } from "@/lib/knowledge/hub/enrich-core";
import { hubDbError, hubNotFound, KnowledgeHubError } from "@/lib/knowledge/hub/hub-http";
import type { KnowledgeLink, LinkStatus } from "@/lib/knowledge/hub/types";

const LINK_SELECT = "id,from_item_id,to_item_id,origin,status,reason,confidence";

/** 이 지식과 이미 어떤 상태로든 이어진 쌍. 거절한 쌍도 포함해 다시 제안하지 않는다. */
export async function existingPairs(workspaceId: string, itemId: string) {
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").select("from_item_id,to_item_id").eq("workspace_id", workspaceId).or(`from_item_id.eq.${itemId},to_item_id.eq.${itemId}`);
  if (error) throw hubDbError(error, "연결 조회");
  return new Set((data || []).map((row) => pairKey(row.from_item_id, row.to_item_id)));
}

export async function saveSuggestedLinks(workspaceId: string, links: { from: string; to: string; reason: string; confidence: number | null }[]) {
  if (!links.length) return 0;
  const rows = links.map((link) => ({ workspace_id: workspaceId, from_item_id: link.from, to_item_id: link.to, origin: "ai", status: "suggested", reason: link.reason.slice(0, 300) || null, confidence: link.confidence }));
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").upsert(rows, { onConflict: "workspace_id,from_item_id,to_item_id", ignoreDuplicates: true }).select("id");
  if (error) throw hubDbError(error, "연결 제안 저장");
  return (data || []).length;
}

async function assertItems(workspaceId: string, ids: string[]) {
  const { data, error } = await supabaseAdmin.from("cw_knowledge_items").select("id").eq("workspace_id", workspaceId).in("id", ids);
  if (error) throw hubDbError(error, "지식 확인");
  if ((data || []).length !== new Set(ids).size) throw hubNotFound();
}

export async function createManualLink(workspaceId: string, userId: string, itemId: string, targetId: string, reason?: string | null) {
  if (itemId === targetId) throw new KnowledgeHubError("SAME_ITEM", "같은 지식끼리는 연결할 수 없습니다.");
  await assertItems(workspaceId, [itemId, targetId]);
  const [from, to] = itemId < targetId ? [itemId, targetId] : [targetId, itemId];
  const row = { workspace_id: workspaceId, from_item_id: from, to_item_id: to, origin: "user", status: "accepted", reason: reason?.trim().slice(0, 300) || null, confidence: null, created_by: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").upsert(row, { onConflict: "workspace_id,from_item_id,to_item_id" }).select(LINK_SELECT).single();
  if (error || !data) throw hubDbError(error, "연결 저장");
  return data as KnowledgeLink;
}

export async function setLinkStatus(workspaceId: string, id: string, status: LinkStatus) {
  if (status !== "accepted" && status !== "rejected") throw new KnowledgeHubError("INVALID_STATUS", "연결은 수락 또는 거절만 할 수 있습니다.");
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").update({ status, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", id).select(LINK_SELECT).maybeSingle();
  if (error) throw hubDbError(error, "연결 상태 변경");
  if (!data) throw hubNotFound("연결을 찾을 수 없습니다.");
  return data as KnowledgeLink;
}

export async function deleteLink(workspaceId: string, id: string) {
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").delete().eq("workspace_id", workspaceId).eq("id", id).select("id");
  if (error) throw hubDbError(error, "연결 삭제");
  if (!data?.length) throw hubNotFound("연결을 찾을 수 없습니다.");
}

/** 지식 1건의 연결(거절 제외)과 상대 지식의 제목·분류. */
export async function listLinksForItem(workspaceId: string, itemId: string) {
  await assertItems(workspaceId, [itemId]);
  const { data, error } = await supabaseAdmin.from("cw_knowledge_links").select(LINK_SELECT).eq("workspace_id", workspaceId).neq("status", "rejected").or(`from_item_id.eq.${itemId},to_item_id.eq.${itemId}`).order("created_at", { ascending: false });
  if (error) throw hubDbError(error, "연결 조회");
  const links = (data || []) as KnowledgeLink[];
  const otherIds = links.map((link) => link.from_item_id === itemId ? link.to_item_id : link.from_item_id);
  if (!otherIds.length) return [];
  const { data: others, error: otherError } = await supabaseAdmin.from("cw_knowledge_items").select("id,title,status,category:cw_knowledge_categories(name,color)").eq("workspace_id", workspaceId).in("id", otherIds);
  if (otherError) throw hubDbError(otherError, "연결 지식 조회");
  const byId = new Map((others || []).map((other) => [other.id, other]));
  return links.flatMap((link) => {
    const otherId = link.from_item_id === itemId ? link.to_item_id : link.from_item_id;
    const other = byId.get(otherId);
    return other ? [{ ...link, other }] : [];
  });
}
