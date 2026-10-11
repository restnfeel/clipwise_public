import { NextRequest, NextResponse } from "next/server";
import { mergeCategory } from "@/lib/knowledge/hub/categories-server";
import { hubNotFound, isUuid, readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    const { targetId } = await readJsonBody(request);
    if (!isUuid(id) || !isUuid(targetId)) throw hubNotFound("분류를 찾을 수 없습니다.");
    return NextResponse.json({ category: await mergeCategory(workspaceId, id, targetId) });
  }, { reviewer: true });
}
