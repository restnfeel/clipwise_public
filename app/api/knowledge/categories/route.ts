import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/knowledge/hub/categories-server";
import { readJsonBody, withKnowledgeWorkspace } from "@/lib/knowledge/hub/hub-http";

export async function GET() {
  return withKnowledgeWorkspace(async ({ workspaceId }) => NextResponse.json(await listCategories(workspaceId)));
}

export async function POST(request: NextRequest) {
  return withKnowledgeWorkspace(async ({ workspaceId, userId }) => {
    const body = await readJsonBody(request);
    const category = await createCategory(workspaceId, userId, { name: body.name, description: body.description, color: body.color }, "user");
    return NextResponse.json({ category }, { status: 201 });
  }, { reviewer: true });
}
