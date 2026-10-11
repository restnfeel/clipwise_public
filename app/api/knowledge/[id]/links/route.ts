import { NextRequest, NextResponse } from "next/server";
import { listLinksForItem } from "@/lib/knowledge/hub/links-server";
import { hubNotFound, isUuid, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isUuid(id)) throw hubNotFound();
    return NextResponse.json({ links: await listLinksForItem(workspaceId, id) });
  });
}
