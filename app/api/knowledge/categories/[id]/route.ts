import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/lib/knowledge/hub/categories-server";
import { hubNotFound, isUuid, readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound("분류를 찾을 수 없습니다.");
    return NextResponse.json({ category: await updateCategory(workspaceId, id, await readJsonBody(request)) });
  }, { reviewer: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound("분류를 찾을 수 없습니다.");
    await deleteCategory(workspaceId, id);
    return NextResponse.json({ deleted: true });
  }, { reviewer: true });
}
