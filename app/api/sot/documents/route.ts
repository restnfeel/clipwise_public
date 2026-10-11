import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth-utils";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { getOwnedSourceConnectionIds, listSourceDocuments, setSourceDocumentsExcluded } from "@/lib/sot/sot-service";

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromSession(); if (!userId) return NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHORIZED" }, { status: 401 });
  const workspaceIds = await workspaceIdsForUser(userId); if (!workspaceIds.length) return NextResponse.json({ documents: [] });
  const provider = new URL(request.url).searchParams.get("provider") || "tiro";
  if (provider !== "tiro") return NextResponse.json({ documents: [] });
  try { const connectionIds = await getOwnedSourceConnectionIds(workspaceIds, "tiro", userId); const documents = await listSourceDocuments(workspaceIds, { provider: "tiro", sourceConnectionIds: connectionIds, query: new URL(request.url).searchParams.get("q") || undefined, limit: 50 }); return NextResponse.json({ documents }); }
  catch { return NextResponse.json({ error: "원본을 불러오지 못했습니다.", code: "STORAGE_ERROR" }, { status: 503 }); }
}
export async function PATCH(request: NextRequest) {
  const userId = await getUserIdFromSession(); if (!userId) return NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => null) as { ids?: unknown; excluded?: unknown } | null; const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
  if (!ids.length || typeof body?.excluded !== "boolean") return NextResponse.json({ error: "제외할 원본을 선택하세요.", code: "INVALID_INPUT" }, { status: 400 });
  const workspaceIds = await workspaceIdsForUser(userId); const connectionIds = new Set(await getOwnedSourceConnectionIds(workspaceIds, "tiro", userId));
  try { const result = await setSourceDocumentsExcluded(workspaceIds, ids, body.excluded, userId, (row) => row.source_system === "tiro" && Boolean(row.source_connection_id && connectionIds.has(row.source_connection_id))); return NextResponse.json(result); }
  catch { return NextResponse.json({ error: "원본 제외 상태를 저장하지 못했습니다.", code: "STORAGE_ERROR" }, { status: 503 }); }
}
