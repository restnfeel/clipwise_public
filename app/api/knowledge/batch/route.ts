import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { createKnowledgeFromTiroNote } from "@/lib/knowledge/knowledge-service";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  const body = await request.json().catch(() => null) as { noteIds?: unknown; limit?: unknown } | null;
  const workspaceIds = await workspaceIdsForUser(auth.userId); const workspaceId = workspaceIds[0];
  if (!workspaceId) return NextResponse.json({ error: "Clipwise workspace가 설정되지 않았습니다." }, { status: 503 });
  let noteIds: string[] = Array.isArray(body?.noteIds) ? body.noteIds.filter((value): value is string => typeof value === "string") : [];
  if (!noteIds.length) {
    const parsedLimit = typeof body?.limit === "number" && Number.isFinite(body.limit) ? Math.min(20, Math.max(1, Math.floor(body.limit))) : 10;
    const { data, error } = await supabaseAdmin.from("cw_tiro_notes").select("id").in("workspace_id", workspaceIds).order("source_updated_at", { ascending: false, nullsFirst: false }).limit(parsedLimit);
    if (error) return NextResponse.json({ error: "Tiro 노트 목록을 읽지 못했습니다." }, { status: 500 });
    noteIds = (data || []).map((row) => row.id).filter((value): value is string => typeof value === "string");
  }
  const results: Array<{ noteId: string; ok: boolean; itemId?: string; error?: string }> = [];
  for (const noteId of noteIds.slice(0, 20)) {
    try { const item = await createKnowledgeFromTiroNote(noteId, workspaceId, auth.userId); results.push({ noteId, ok: true, itemId: item.id }); }
    catch (error) { results.push({ noteId, ok: false, error: error instanceof Error ? error.message : "지식화 실패" }); }
  }
  return NextResponse.json({ processed: results.length, succeeded: results.filter((result) => result.ok).length, results });
}
