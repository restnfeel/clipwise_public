import { NextRequest, NextResponse } from "next/server";
import { deleteLink, setLinkStatus } from "@/lib/knowledge/hub/links-server";
import { hubNotFound, isUuid, readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";
import type { LinkStatus } from "@/lib/knowledge/hub/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound("연결을 찾을 수 없습니다.");
    const { status } = await readJsonBody(request);
    return NextResponse.json({ link: await setLinkStatus(workspaceId, id, status as LinkStatus) });
  }, { reviewer: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound("연결을 찾을 수 없습니다.");
    await deleteLink(workspaceId, id);
    return NextResponse.json({ ok: true });
  }, { reviewer: true });
}
