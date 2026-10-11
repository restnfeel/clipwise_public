import { supabaseAdmin } from "@/lib/supabase";
import { scheduleKnowledgeEnrich } from "@/lib/knowledge/hub/enrich-server";
import { buildDocumentAnalysisRow, DOCUMENT_ANALYSIS_SOURCE, type DocumentAnalysisInput } from "@/lib/knowledge/document-analysis";

export type DocumentAnalysisSaveResult =
  | { ok: true; created: boolean; item: { id: string; title: string; status: string; updated_at: string } }
  | { ok: false; code: "ALREADY_REVIEWED" | "STORAGE_ERROR"; message: string; itemId?: string };

async function clientNameFor(clientId?: string) {
  if (!clientId) return "MCP";
  const { data } = await supabaseAdmin.from("cw_mcp_oauth_clients").select("client_name").eq("id", clientId).maybeSingle();
  return data?.client_name || "MCP";
}

export async function saveDocumentAnalysis(input: { workspaceId: string; userId?: string; clientId?: string; analysis: DocumentAnalysisInput }): Promise<DocumentAnalysisSaveResult> {
  const now = new Date().toISOString();
  const row = buildDocumentAnalysisRow(input.analysis, { clientName: await clientNameFor(input.clientId), now });
  const { data: existing, error: findError } = await supabaseAdmin.from("cw_knowledge_items")
    .select("id,status")
    .eq("workspace_id", input.workspaceId).eq("source_system", DOCUMENT_ANALYSIS_SOURCE).eq("source_id", row.source_id).eq("type", row.type)
    .maybeSingle();
  if (findError) {
    console.error("[document-analysis] 기존 항목 조회 실패", findError.message);
    return { ok: false, code: "STORAGE_ERROR", message: "지식 원장을 확인하지 못했습니다." };
  }
  if (existing && existing.status !== "draft") {
    return { ok: false, code: "ALREADY_REVIEWED", message: "같은 문서·제목의 지식이 이미 검토되었습니다. 제목을 바꿔 새로 저장하거나 Clipwise에서 직접 수정하세요.", itemId: existing.id };
  }

  const select = "id,title,status,updated_at";
  const result = existing
    ? await supabaseAdmin.from("cw_knowledge_items").update({ ...row, updated_at: now }).eq("id", existing.id).eq("workspace_id", input.workspaceId).select(select).single()
    : await supabaseAdmin.from("cw_knowledge_items").insert({ ...row, workspace_id: input.workspaceId, created_by: input.userId || null }).select(select).single();
  if (result.error || !result.data) {
    console.error("[document-analysis] 저장 실패", result.error?.message);
    return { ok: false, code: "STORAGE_ERROR", message: "문서 분석 내용을 저장하지 못했습니다." };
  }

  const { error: eventError } = await supabaseAdmin.from("cw_knowledge_item_events").insert({
    workspace_id: input.workspaceId, knowledge_item_id: result.data.id, action: existing ? "update" : "create",
    actor_user_id: input.userId || null, source: "mcp", from_status: existing ? "draft" : null, to_status: "draft",
    metadata: { sourceSystem: DOCUMENT_ANALYSIS_SOURCE, fileName: input.analysis.document.fileName },
  });
  if (eventError) console.error("[document-analysis] 이벤트 기록 실패", eventError.message);
  scheduleKnowledgeEnrich(input.workspaceId, result.data.id);
  return { ok: true, created: !existing, item: result.data };
}
