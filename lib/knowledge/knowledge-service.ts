import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { isHubSchemaMissing, KNOWLEDGE_ITEM_SELECT } from "@/lib/knowledge/hub/types";
import { scheduleKnowledgeEnrich } from "@/lib/knowledge/hub/enrich-server";
import { syncKnowledgeArchive } from "@/lib/knowledge/archive/archive-server";

export const knowledgeResultSchema = z.object({
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(5000).default(""),
  topics: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  entities: z.array(z.object({ name: z.string().trim().min(1).max(200), type: z.string().trim().max(80).default("unknown") })).max(50).default([]),
  decisions: z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
  actionItems: z.array(z.object({ task: z.string().trim().min(1).max(1000), owner: z.string().trim().max(200).nullable().default(null), dueDate: z.string().trim().max(50).nullable().default(null) })).max(30).default([]),
});

export type KnowledgeResult = z.infer<typeof knowledgeResultSchema>;

type TiroSource = { id: string; workspace_id?: string | null; source_id: string; title: string; content: string; summary?: string | null; source_updated_at?: string | null };

export function extractKnowledge(source: TiroSource): KnowledgeResult {
  const text = (source.summary || source.content || "").trim();
  const sentences = text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  return { title: source.title || "Tiro 기록", summary: sentences.slice(0, 4).join(" ").slice(0, 5000), topics: [], entities: [], decisions: [], actionItems: [] };
}

export async function createKnowledgeFromTiroNote(noteId: string, workspaceId: string, actorUserId?: string | null) {
  let { data: source, error: sourceError } = await supabaseAdmin.from("cw_tiro_notes").select("id,workspace_id,source_id,title,content,summary,source_updated_at").eq("id", noteId).maybeSingle();
  if (sourceError) throw new Error("Tiro 원본을 읽지 못했습니다.");
  if (!source) throw new Error("Tiro 노트를 찾을 수 없습니다.");
  if (source.workspace_id && source.workspace_id !== workspaceId) throw new Error("Tiro 노트의 workspace가 요청 workspace와 일치하지 않습니다.");
  const { data: sourceDocument, error: sourceDocumentError } = await supabaseAdmin.from("cw_source_documents").select("id,source_revision").eq("workspace_id", workspaceId).eq("source_system", "tiro").eq("source_id", source.source_id).maybeSingle();
  const { data: existing } = await supabaseAdmin.from("cw_knowledge_items").select("id,status").eq("workspace_id", workspaceId).eq("source_system", "tiro").eq("source_id", source.source_id).eq("type", "meeting").maybeSingle();
  const processing: Record<string, unknown> = { workspace_id: workspaceId, source_system: "tiro", source_id: source.source_id, source_note_id: source.id, type: "meeting", title: source.title, body: source.content || "", status: "processing", visibility: "private", source_updated_at: source.source_updated_at || null, created_by: actorUserId || null, updated_at: new Date().toISOString() };
  if (!sourceDocumentError) { processing.source_document_id = sourceDocument?.id || null; processing.source_revision = sourceDocument?.source_revision || source.source_updated_at || null; }
  const { data: item, error: processingError } = existing
    ? await supabaseAdmin.from("cw_knowledge_items").update(processing).eq("id", existing.id).select("*").single()
    : await supabaseAdmin.from("cw_knowledge_items").insert(processing).select("*").single();
  if (processingError || !item) throw new Error("지식화 작업을 시작하지 못했습니다.");
  if (existing) await syncKnowledgeArchive([existing.id]);
  const result = extractKnowledge(source);
  const generatedFields = sourceDocumentError ? {} : { model: "rule-based", prompt_version: "clipwise-knowledge-rule-v1", generated_at: new Date().toISOString() };
  const { data: saved, error } = await supabaseAdmin.from("cw_knowledge_items").update({ title: result.title, summary: result.summary, topics: result.topics, entities: result.entities, decisions: result.decisions, action_items: result.actionItems, status: "draft", ...generatedFields, metadata: { extractor: "clipwise-knowledge-rule-v1", source: "tiro" }, updated_at: new Date().toISOString() }).eq("id", item.id).select("*").single();
  if (error || !saved) throw new Error("지식화 결과를 저장하지 못했습니다.");
  await supabaseAdmin.from("cw_knowledge_item_events").insert({ workspace_id: workspaceId, knowledge_item_id: saved.id, action: "extract", actor_user_id: actorUserId || null, source: "tiro", from_status: "processing", to_status: "draft" });
  scheduleKnowledgeEnrich(workspaceId, saved.id);
  return saved;
}

export { isHubSchemaMissing, KNOWLEDGE_ITEM_SELECT };

export async function listKnowledgeItems(options: { workspaceIds: string[]; query?: string; status?: string; limit?: number; readableOnly?: boolean; categoryId?: string | "none"; tag?: string }) {
  if (!options.workspaceIds.length) return [];
  const build = (select: string, withHub: boolean) => {
    let request = supabaseAdmin.from("cw_knowledge_items").select(select).in("workspace_id", options.workspaceIds).order("updated_at", { ascending: false }).limit(Math.min(100, Math.max(1, options.limit || 30)));
    if (options.query?.trim()) { const q = options.query.trim().replace(/[\\%_]/g, "\\$&"); request = request.or(`title.ilike.%${q}%,summary.ilike.%${q}%,body.ilike.%${q}%`); }
    if (options.status) request = request.eq("status", options.status);
    if (options.readableOnly) request = request.in("status", ["reviewed", "published"]);
    if (options.tag?.trim()) request = request.contains("topics", [options.tag.trim()]);
    if (withHub && options.categoryId === "none") request = request.is("category_id", null);
    else if (withHub && options.categoryId) request = request.eq("category_id", options.categoryId);
    return request;
  };
  let { data, error } = await build(KNOWLEDGE_ITEM_SELECT, true);
  if (isHubSchemaMissing(error)) {
    if (options.categoryId) return [];
    ({ data, error } = await build("*", false));
  }
  if (error) throw new Error("지식 목록을 읽지 못했습니다.");
  return (data || []) as unknown as Record<string, unknown>[];
}
