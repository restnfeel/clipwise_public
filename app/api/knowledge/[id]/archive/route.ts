import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { ArchiveError, archiveStatusFor, publishToArchive, readArchiveItem, unpublishFromArchive } from "@/lib/knowledge/archive/archive-server";
import { canReviewWorkspace } from "@/lib/workspace/workspace-settings";

type Params = { params: Promise<{ id: string }> };

/** 지식이 내 워크스페이스 소속인지(404) 확인한 뒤, 그 워크스페이스의 검수 권한(403)을 본다. */
async function authorize(itemId: string) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return { error: auth.error };
  const workspaceIds = await workspaceIdsForUser(auth.userId);
  const item = await readArchiveItem(itemId, workspaceIds);
  if (!(await canReviewWorkspace(auth.userId, item.workspace_id))) {
    return { error: NextResponse.json({ error: "이 워크스페이스의 검수 권한이 필요합니다.", code: "FORBIDDEN" }, { status: 403 }) };
  }
  return { userId: auth.userId, workspaceIds };
}

function failure(error: unknown) {
  if (error instanceof ArchiveError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("[knowledge-archive] 처리 실패", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "아카이브 처리에 실패했습니다." }, { status: 500 });
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const access = await authorize(id);
    if ("error" in access) return access.error;
    return NextResponse.json({ archive: await publishToArchive(id, access.workspaceIds, access.userId) });
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const access = await authorize(id);
    if ("error" in access) return access.error;
    await unpublishFromArchive([id]);
    return NextResponse.json({ archive: (await archiveStatusFor([id])).get(id) || null });
  } catch (error) { return failure(error); }
}
