import { NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { listStoredTiroNotes, syncTiroNotes, tiroErrorDetails } from "@/lib/tiro/clipwise-tiro";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const auth = await requireApiUserId();
    if (isApiAuthError(auth)) return auth.error;
    const workspaceIds = await workspaceIdsForUser(auth.userId);
    const notes = await listStoredTiroNotes({ limit: 50, workspaceIds });
    const noteIds = notes.map((note) => note.id);
    if (!noteIds.length) return NextResponse.json({ notes: [] });

    const { data: knowledgeItems, error: knowledgeError } = await supabaseAdmin
      .from("cw_knowledge_items")
      .select("id,source_note_id,status")
      .eq("source_system", "tiro")
      .in("source_note_id", noteIds);
    if (knowledgeError) throw new Error("지식화 상태를 확인하지 못했습니다.");

    const itemsByNote = new Map((knowledgeItems || []).map((item) => [item.source_note_id, item]));
    return NextResponse.json({
      notes: notes.map((note) => {
        const item = itemsByNote.get(note.id);
        return { ...note, knowledgeized: Boolean(item), knowledge_item_id: item?.id || null, knowledge_status: item?.status || null };
      }),
    });
  } catch (error) {
    const failure = tiroErrorDetails(error, "Tiro 노트를 불러오지 못했습니다.");
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: 503 });
  }
}

export async function POST() {
  try {
    const auth = await requireApiUserId();
    if (isApiAuthError(auth)) return auth.error;
    const workspaceId = (await workspaceIdsForUser(auth.userId))[0];
    if (!workspaceId) return NextResponse.json({ error: "개인 workspace를 준비하지 못했습니다.", code: "WORKSPACE_NOT_CONFIGURED" }, { status: 503 });
    return NextResponse.json({ sync: await syncTiroNotes({ workspaceId, userId: auth.userId }) });
  } catch (error) {
    const failure = tiroErrorDetails(error, "Tiro 동기화에 실패했습니다.");
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: 503 });
  }
}
