import { NextRequest, NextResponse } from "next/server";
import { assignCategory } from "@/lib/knowledge/hub/categories-server";
import { hubNotFound, isUuid, KnowledgeHubError, readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export async function POST(request: NextRequest) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const body = await readJsonBody(request);
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds : [];
    if (!itemIds.length || itemIds.length > 100) throw new KnowledgeHubError("INVALID_SELECTION", "지식을 1~100건 선택하세요.");
    if (!itemIds.every(isUuid)) throw hubNotFound();
    if (body.categoryId !== null && !isUuid(body.categoryId)) throw hubNotFound("분류를 찾을 수 없습니다.");
    const updated = await assignCategory(workspaceId, itemIds, body.categoryId, "user");
    return NextResponse.json({ updated });
  }, { reviewer: true });
}
