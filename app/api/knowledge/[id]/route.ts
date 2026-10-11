import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { supabaseAdmin } from "@/lib/supabase";
import { workspaceIdsForUser, workspaceRoleForUser } from "@/lib/connector/workspace-scope";
import { assignCategory } from "@/lib/knowledge/hub/categories-server";
import { isUuid, KnowledgeHubError, REVIEWER_ROLES } from "@/lib/knowledge/hub/hub-http";
import { isHubSchemaMissing, KNOWLEDGE_ITEM_SELECT, USER_TOPICS_MAX } from "@/lib/knowledge/hub/types";
import { archiveStatusFor, syncKnowledgeArchive, unpublishFromArchive } from "@/lib/knowledge/archive/archive-server";

function parseUserTopics(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const topics: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const topic = entry.replace(/^#+/, "").replace(/\s+/g, " ").trim();
    if (topic.length > 30) return null;
    if (topic && !topics.includes(topic)) topics.push(topic);
  }
  return topics.length <= USER_TOPICS_MAX ? topics : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  const { id } = await params; const ids = await workspaceIdsForUser(auth.userId);
  const read = (select: string) => supabaseAdmin.from("cw_knowledge_items").select(select).eq("id", id).in("workspace_id", ids).maybeSingle();
  let { data, error } = await read(KNOWLEDGE_ITEM_SELECT);
  if (isHubSchemaMissing(error)) ({ data, error } = await read("*"));
  if (error || !data) return NextResponse.json({ error: "지식을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ item: { ...(data as unknown as Record<string, unknown>), archive: (await archiveStatusFor([id])).get(id) || null } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; visibility?: unknown; title?: unknown; summary?: unknown; categoryId?: unknown; topics?: unknown } | null;
  const ids = await workspaceIdsForUser(auth.userId);
  const { data: current } = await supabaseAdmin.from("cw_knowledge_items").select("workspace_id,status").eq("id", id).in("workspace_id", ids).maybeSingle();
  if (!current) return NextResponse.json({ error: "지식을 찾을 수 없습니다." }, { status: 404 });
  const requestedStatus = typeof body?.status === "string" ? body.status : null;
  if (requestedStatus && !["draft", "reviewed", "published"].includes(requestedStatus)) return NextResponse.json({ error: "지원하지 않는 상태입니다." }, { status: 400 });
  const role = await workspaceRoleForUser(auth.userId, current.workspace_id);
  const organizes = body?.categoryId !== undefined || body?.topics !== undefined;
  if ((requestedStatus || body?.visibility === "public" || organizes) && !REVIEWER_ROLES.includes(role || "")) return NextResponse.json({ error: "workspace 검수 권한이 필요합니다." }, { status: 403 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["status", "visibility", "title", "summary"] as const) if (typeof body?.[key] === "string") updates[key] = body[key];
  if (body?.topics !== undefined) {
    const topics = parseUserTopics(body.topics);
    if (!topics) return NextResponse.json({ error: `태그는 ${USER_TOPICS_MAX}개 이하, 각 30자 이내로 입력하세요.` }, { status: 400 });
    updates.topics = topics;
    updates.topics_source = "user";
  }
  if (body?.categoryId !== undefined) {
    if (body.categoryId !== null && !isUuid(body.categoryId)) return NextResponse.json({ error: "분류를 찾을 수 없습니다." }, { status: 404 });
    try { await assignCategory(current.workspace_id, [id], body.categoryId, "user"); }
    catch (error) {
      if (error instanceof KnowledgeHubError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      throw error;
    }
  }
  // 공유를 취소하면 workspace 공개 범위도 함께 회수한다.
  if (requestedStatus && requestedStatus !== "published" && body?.visibility === undefined) updates.visibility = "private";
  let { data, error } = await supabaseAdmin.from("cw_knowledge_items").update(updates).eq("id", id).eq("workspace_id", current.workspace_id).select(KNOWLEDGE_ITEM_SELECT).maybeSingle();
  if (isHubSchemaMissing(error) && !organizes) ({ data, error } = await supabaseAdmin.from("cw_knowledge_items").update(updates).eq("id", id).eq("workspace_id", current.workspace_id).select("*").maybeSingle());
  if (error || !data) return NextResponse.json({ error: "지식을 수정하지 못했습니다." }, { status: 400 });
  await supabaseAdmin.from("cw_knowledge_item_events").insert({ workspace_id: data.workspace_id, knowledge_item_id: data.id, action: "update", actor_user_id: auth.userId, source: "web", from_status: current.status, to_status: data.status });
  await syncKnowledgeArchive([id]);
  return NextResponse.json({ item: { ...(data as unknown as Record<string, unknown>), archive: (await archiveStatusFor([id])).get(id) || null } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  const { id } = await params;
  const ids = await workspaceIdsForUser(auth.userId);
  const { data: current } = await supabaseAdmin.from("cw_knowledge_items").select("workspace_id").eq("id", id).in("workspace_id", ids).maybeSingle();
  if (!current) return NextResponse.json({ error: "지식을 찾을 수 없습니다." }, { status: 404 });
  const role = await workspaceRoleForUser(auth.userId, current.workspace_id);
  if (!REVIEWER_ROLES.includes(role || "")) return NextResponse.json({ error: "workspace 검수 권한이 필요합니다." }, { status: 403 });
  try { await unpublishFromArchive([id]); }
  catch { return NextResponse.json({ error: "아카이브 공개 글을 내리지 못해 삭제를 멈췄습니다." }, { status: 500 }); }
  const { error } = await supabaseAdmin.from("cw_knowledge_items").delete().eq("id", id).eq("workspace_id", current.workspace_id);
  if (error) return NextResponse.json({ error: "지식을 삭제하지 못했습니다." }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
