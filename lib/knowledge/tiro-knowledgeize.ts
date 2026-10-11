import { createKnowledgeFromTiroNote } from "@/lib/knowledge/knowledge-service";
import { supabaseAdmin } from "@/lib/supabase";

export async function knowledgeizeTiroNote(noteId: string, actorUserId: string) {
  const { data: note, error: noteError } = await supabaseAdmin
    .from("cw_tiro_notes")
    .select("id,workspace_id")
    .eq("id", noteId)
    .maybeSingle();
  if (noteError || !note) throw new Error("Tiro 노트를 찾을 수 없습니다.");
  const { data: membership } = await supabaseAdmin.from("cw_workspace_memberships").select("workspace_id").eq("workspace_id", note.workspace_id).eq("user_id", actorUserId).maybeSingle();
  if (!membership) throw new Error("Tiro 노트에 접근할 수 없습니다.");
  const workspaceId = note.workspace_id;
  return createKnowledgeFromTiroNote(noteId, workspaceId, actorUserId);
}
