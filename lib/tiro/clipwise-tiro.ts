import { supabaseAdmin } from "@/lib/supabase";
import { TiroApiClient, TiroApiError } from "@/lib/tiro/tiro-client";
import { normalizeTiroNote, type ClipwiseTiroNote } from "@/lib/tiro/tiro-model";
import { resolveSourceCredentials } from "@/lib/sot/credentials";
import { SourceAdapterError } from "@/lib/sot/types";
import { upsertSourceDocument } from "@/lib/sot/sot-service";

export class TiroConnectorError extends Error {
  constructor(readonly code: "CONFIGURATION_ERROR" | "TIRO_API_ERROR" | "STORAGE_ERROR", message: string, readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "TiroConnectorError";
  }
}

export function tiroErrorDetails(error: unknown, fallback: string) {
  if (error instanceof TiroConnectorError) return error;
  if (error instanceof TiroApiError) {
    return new TiroConnectorError("TIRO_API_ERROR", "Tiro API 요청에 실패했습니다.", {
      upstreamStatus: error.status,
      retryable: error.retryable,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  if (error instanceof Error && /workspace|Supabase|credential|configuration/i.test(error.message)) {
    return new TiroConnectorError("CONFIGURATION_ERROR", "Tiro 연동 환경 설정이 필요합니다.");
  }
  return new TiroConnectorError("STORAGE_ERROR", fallback);
}

/** 사용자가 등록한 Tiro 자격증명을 읽는다. */
export async function resolveTiroCredentials(workspaceId: string, userId: string) {
  const target = workspaceId;
  if (!target) throw new TiroConnectorError("CONFIGURATION_ERROR", "Clipwise workspace가 설정되지 않았습니다.");
  try {
    const { values } = await resolveSourceCredentials(target, "tiro", userId);
    return { apiKey: values.apiKey, workspaceGuid: values.workspaceGuid };
  } catch (error) {
    if (error instanceof SourceAdapterError) throw new TiroConnectorError("CONFIGURATION_ERROR", error.message);
    throw error;
  }
}

export async function listStoredTiroNotes(options: { limit?: number; workspaceIds: string[] }) {
  const limit = typeof options === "number" ? options : options.limit ?? 10;
  const workspaceIds = options.workspaceIds;
  if (!workspaceIds.length) return [];
  let query = supabaseAdmin
    .from("cw_tiro_notes")
    .select("id,workspace_id,source_id,source_workspace_id,title,content,summary,source_updated_at,synced_at,updated_at")
    .order("source_updated_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(50, Math.max(1, limit)));
  if (workspaceIds.length) query = query.in("workspace_id", workspaceIds);
  let { data, error } = await query;
  if (error) throw new TiroConnectorError("STORAGE_ERROR", "Tiro 노트를 읽지 못했습니다.");
  return data || [];
}

export async function searchStoredTiroNotes(query: string, options: { limit?: number; workspaceIds: string[] }) {
  const term = query.trim().replace(/[\\%_(),]/g, "\\$&");
  if (!term) return [];
  const limit = typeof options === "number" ? options : options.limit ?? 10;
  const workspaceIds = options.workspaceIds;
  if (!workspaceIds.length) return [];
  let request = supabaseAdmin
    .from("cw_tiro_notes")
    .select("id,workspace_id,source_id,source_workspace_id,title,content,summary,source_updated_at,synced_at,updated_at")
    .or(`title.ilike.%${term}%,content.ilike.%${term}%,summary.ilike.%${term}%`)
    .order("source_updated_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(50, Math.max(1, limit)));
  if (workspaceIds.length) request = request.in("workspace_id", workspaceIds);
  let { data, error } = await request;
  if (error) throw new TiroConnectorError("STORAGE_ERROR", "Tiro 노트를 검색하지 못했습니다.");
  return data || [];
}

export async function syncTiroNotes(input: { workspaceId: string; userId: string }) {
  const workspaceId = input.workspaceId;
  const { apiKey, workspaceGuid } = await resolveTiroCredentials(workspaceId, input.userId);
  const client = new TiroApiClient({ apiKey });
  let notes: Record<string, unknown>[];
  try {
    notes = await client.listNotes(workspaceGuid);
  } catch (error) {
    throw mapTiroError(error, "Tiro 노트를 가져오지 못했습니다.");
  }
  const rows: ClipwiseTiroNote[] = [];
  try {
    for (const note of notes) {
      const sourceId = typeof note.guid === "string" ? note.guid : typeof note.id === "string" ? note.id : "";
      if (!sourceId) continue;
      const [paragraphs, summaryList] = await Promise.all([client.listParagraphs(sourceId), client.listSummaries(sourceId)]);
      const summaries = await Promise.all((summaryList.content || []).map(async (summary) => {
        if (!isRecord(summary) || !summary.id || hasSummaryBody(summary)) return summary;
        return client.getSummary(sourceId, String(summary.id));
      }));
      rows.push(normalizeTiroNote({ workspaceId, workspaceGuid, note, paragraphs, summaries }));
    }
    if (rows.length) {
      const syncedAt = new Date().toISOString();
      const upsertRows = rows.map((row) => {
        return { ...row, synced_at: syncedAt, updated_at: syncedAt };
      });
      const { error } = await supabaseAdmin.from("cw_tiro_notes").upsert(upsertRows, { onConflict: "workspace_id,source_system,source_id,source_workspace_id" });
      if (error) throw new TiroConnectorError("STORAGE_ERROR", "Tiro 노트를 저장하지 못했습니다.");
      if (workspaceId) {
        try {
          for (const row of rows) {
            await upsertSourceDocument({
              workspaceId,
              sourceSystem: "tiro",
              sourceConnectionId: null,
              sourceId: row.source_id,
              sourceWorkspaceId: row.source_workspace_id,
              sourceUrl: null,
              title: row.title,
              body: row.content,
              mimeType: "text/plain",
              capturedAt: row.source_updated_at,
              sourceUpdatedAt: row.source_updated_at,
              sourceRevision: row.source_updated_at,
              language: "ko",
              status: "active",
              metadata: { summary: row.summary, legacyTable: "cw_tiro_notes" },
              rawPayload: row.raw_payload,
            });
          }
        } catch (error) {
          if (!isMissingSotTable(error)) throw error;
        }
      }
    }
  } catch (error) {
    throw mapTiroError(error, "Tiro 동기화에 실패했습니다.");
  }
  return { workspaceGuid, workspaceId, fetched: notes.length, upserted: rows.length };
}

function hasSummaryBody(value: Record<string, unknown>) {
  return ["content", "summary", "text", "body"].some((key) => Boolean(typeof value[key] === "string" && String(value[key]).trim()));
}

function mapTiroError(error: unknown, fallback: string): TiroConnectorError {
  return tiroErrorDetails(error, fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMissingSotTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /cw_source_documents|cw_source_revisions|relation .* does not exist|PGRST205|42P01/i.test(message);
}
