import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { createKnowledgeFromTiroNote, listKnowledgeItems } from "@/lib/knowledge/knowledge-service";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { archiveStatusFor } from "@/lib/knowledge/archive/archive-server";

export async function GET(request: NextRequest) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  try { const workspaceIds = await workspaceIdsForUser(auth.userId); const params = request.nextUrl.searchParams; const category = params.get("category"); const items = await listKnowledgeItems({ workspaceIds, query: params.get("q") || undefined, status: params.get("status") || undefined, limit: Number(params.get("limit") || 30), categoryId: category === "none" || (category && /^[0-9a-f-]{36}$/i.test(category)) ? category : undefined, tag: params.get("tag") || undefined }); const archive = await archiveStatusFor(items.map((item) => String(item.id))); return NextResponse.json({ items: items.map((item) => ({ ...item, archive: archive.get(String(item.id)) || null })) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "지식 목록을 읽지 못했습니다." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUserId(); if (isApiAuthError(auth)) return auth.error;
  const body = await request.json().catch(() => null) as { sourceNoteId?: unknown } | null;
  if (typeof body?.sourceNoteId !== "string") return NextResponse.json({ error: "sourceNoteId가 필요합니다." }, { status: 400 });
  try { const workspaceIds = await workspaceIdsForUser(auth.userId); if (!workspaceIds[0]) return NextResponse.json({ error: "개인 workspace가 설정되지 않았습니다." }, { status: 503 }); const item = await createKnowledgeFromTiroNote(body.sourceNoteId, workspaceIds[0], auth.userId); return NextResponse.json({ item }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "지식화에 실패했습니다." }, { status: 500 }); }
}
