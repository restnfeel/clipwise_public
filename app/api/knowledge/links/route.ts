import { NextRequest, NextResponse } from "next/server";
import { createManualLink } from "@/lib/knowledge/hub/links-server";
import { hubNotFound, isUuid, readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export async function POST(request: NextRequest) {
  return withKnowledgeWorkspace(async ({ workspaceId, userId }) => {
    const { itemId, targetId, reason } = await readJsonBody(request);
    if (!isUuid(itemId) || !isUuid(targetId)) throw hubNotFound();
    return NextResponse.json({ link: await createManualLink(workspaceId, userId, itemId, targetId, typeof reason === "string" ? reason : null) }, { status: 201 });
  }, { reviewer: true });
}
