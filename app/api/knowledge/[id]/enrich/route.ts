import { NextRequest, NextResponse } from "next/server";
import { enrichKnowledgeItem } from "@/lib/knowledge/hub/enrich-server";
import { hubNotFound, isUuid, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export const maxDuration = 120;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withKnowledgeWorkspace(async ({ workspaceId, userId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound();
    const result = await enrichKnowledgeItem(workspaceId, id, userId);
    return NextResponse.json({ ...result, warning: result.aiStatus === "model-only" ? null : "AI 판정 정보를 사용할 수 없습니다." });
  }, { reviewer: true });
}
