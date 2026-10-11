import { NextResponse } from "next/server";
import { enrichBatch } from "@/lib/knowledge/hub/enrich-server";
import { withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export const maxDuration = 300;

export async function POST() {
  return withKnowledgeWorkspace(async ({ workspaceId, userId }) => NextResponse.json(await enrichBatch(workspaceId, userId)), { reviewer: true });
}
