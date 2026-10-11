import { NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { knowledgeizeTiroNote } from "@/lib/knowledge/tiro-knowledgeize";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUserId();
    if (isApiAuthError(auth)) return auth.error;
    const workspaceId = (await workspaceIdsForUser(auth.userId))[0];
    const noteId = new URL(request.url).searchParams.get("noteId")?.trim();
    if (!noteId) return NextResponse.json({ error: "Tiro note id가 필요합니다." }, { status: 400 });
    const item = await knowledgeizeTiroNote(noteId, auth.userId);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tiro 노트 지식화에 실패했습니다." },
      { status: 500 },
    );
  }
}
