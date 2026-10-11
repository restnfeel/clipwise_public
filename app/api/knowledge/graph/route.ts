import { NextRequest, NextResponse } from "next/server";
import { buildKnowledgeGraph } from "@/lib/knowledge/hub/graph-server";
import { isUuid, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

const STATUSES = new Set(["processing", "draft", "reviewed", "published", "failed"]);

export async function GET(request: NextRequest) {
  return withKnowledgeWorkspace(async ({ workspaceId }) => {
    const params = request.nextUrl.searchParams;
    const status = params.get("status") || "";
    const category = params.get("category") || "";
    return NextResponse.json(await buildKnowledgeGraph(workspaceId, {
      status: STATUSES.has(status) ? status : undefined,
      categoryId: category === "none" || isUuid(category) ? category : undefined,
      tag: params.get("tag")?.slice(0, 60) || undefined,
    }));
  });
}
