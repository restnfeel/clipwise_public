import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { isUserScopedProvider, type SourceProviderStatus } from "@/lib/sot/providers";
import type { SourceConnection, SourceDocumentInput } from "@/lib/sot/types";

export function sourceChecksum(input: Pick<SourceDocumentInput, "title" | "body" | "sourceRevision">) {
  return createHash("sha256").update(JSON.stringify({ title: input.title, body: input.body, sourceRevision: input.sourceRevision || null })).digest("hex");
}

export async function upsertSourceDocument(input: SourceDocumentInput) {
  const checksum = sourceChecksum(input);
  const { data: existing } = await supabaseAdmin.from("cw_source_documents").select("checksum,status,metadata").eq("workspace_id", input.workspaceId).eq("source_system", input.sourceSystem).eq("source_id", input.sourceId).maybeSingle();
  const exclusion = exclusionOf(existing?.metadata);
  const status = exclusion ? "unavailable" : input.status;
  const changed = !existing || existing.checksum !== checksum || existing.status !== status;
  const row = {
    workspace_id: input.workspaceId,
    source_system: input.sourceSystem,
    source_connection_id: input.sourceConnectionId,
    source_id: input.sourceId,
    source_workspace_id: input.sourceWorkspaceId,
    source_url: input.sourceUrl,
    title: input.title,
    body: input.body,
    mime_type: input.mimeType,
    captured_at: input.capturedAt,
    source_updated_at: input.sourceUpdatedAt,
    source_revision: input.sourceRevision,
    checksum,
    language: input.language,
    status,
    metadata: exclusion ? { ...input.metadata, ...exclusion } : input.metadata,
    updated_at: new Date().toISOString(),
  };
  const { data: document, error } = await supabaseAdmin.from("cw_source_documents").upsert(row, { onConflict: "workspace_id,source_system,source_id" }).select("*").single();
  if (error || !document) throw new Error(`SOT 원본 저장에 실패했습니다: ${error?.message || "응답 없음"}`);
  const { error: revisionError } = await supabaseAdmin.from("cw_source_revisions").upsert({
    workspace_id: input.workspaceId,
    source_document_id: document.id,
    source_revision: input.sourceRevision,
    checksum,
    title: input.title,
    body: input.body,
    raw_payload: input.rawPayload || {},
    captured_at: input.capturedAt,
  }, { onConflict: "source_document_id,checksum" });
  if (revisionError) throw new Error(`SOT revision 저장에 실패했습니다: ${revisionError.message}`);
  return { document, checksum, changed };
}

type SourceExclusion = { excluded: true; excludedAt: string; excludedBy: string | null };

function exclusionOf(metadata: unknown): SourceExclusion | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  if (value.excluded !== true) return null;
  return { excluded: true, excludedAt: typeof value.excludedAt === "string" ? value.excludedAt : new Date().toISOString(), excludedBy: typeof value.excludedBy === "string" ? value.excludedBy : null };
}

/** 사용자가 제외한 원본은 status를 unavailable로 두어 active만 읽는 하위 기능에서 빠지고, 재동기화에도 유지된다. */
export async function setSourceDocumentsExcluded(workspaceIds: string[], documentIds: string[], excluded: boolean, actorUserId: string, canEdit: (row: { source_system: string; source_connection_id: string | null }) => boolean) {
  const { data, error } = await supabaseAdmin.from("cw_source_documents").select("id,source_system,source_connection_id,status,metadata").in("workspace_id", workspaceIds).in("id", documentIds).neq("status", "deleted");
  if (error) throw new Error("원본을 확인하지 못했습니다.");
  const targets = (data || []).filter(canEdit);
  const now = new Date().toISOString();
  for (const row of targets) {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? { ...(row.metadata as Record<string, unknown>) } : {};
    if (excluded) Object.assign(metadata, { excluded: true, excludedAt: now, excludedBy: actorUserId });
    else { delete metadata.excluded; delete metadata.excludedAt; delete metadata.excludedBy; }
    const status = excluded ? "unavailable" : row.status === "unavailable" && exclusionOf(row.metadata) ? "active" : row.status;
    const { error: updateError } = await supabaseAdmin.from("cw_source_documents").update({ status, metadata, updated_at: now }).eq("id", row.id);
    if (updateError) throw new Error("원본 제외 상태를 저장하지 못했습니다.");
  }
  return { updated: targets.length, skipped: documentIds.length - targets.length };
}

/** 전체 목록 동기화가 끝났을 때 이번 목록에 없던 원본을 물리 삭제 없이 unavailable로 표시한다. */
export async function markMissingSourcesUnavailable(workspaceId: string, provider: string, seenSourceIds: string[]) {
  const { data, error } = await supabaseAdmin.from("cw_source_documents").select("id,source_id").eq("workspace_id", workspaceId).eq("source_system", provider).eq("status", "active");
  if (error) throw new Error(`SOT 원본 상태를 확인하지 못했습니다: ${error.message}`);
  const seen = new Set(seenSourceIds);
  const missing = (data || []).filter((row) => !seen.has(String(row.source_id))).map((row) => row.id as string);
  if (!missing.length) return 0;
  const { error: updateError } = await supabaseAdmin.from("cw_source_documents").update({ status: "unavailable", updated_at: new Date().toISOString() }).in("id", missing);
  if (updateError) throw new Error(`SOT 원본 상태를 갱신하지 못했습니다: ${updateError.message}`);
  return missing.length;
}

export async function getOwnedSourceConnectionIds(workspaceIds: string[], provider: string, ownerUserId: string) {
  const { data, error } = await supabaseAdmin.from("cw_source_connections").select("id,user_id,metadata").in("workspace_id", workspaceIds).eq("provider", provider).eq("status", "active");
  if (error) throw new Error("원본 연결 소유권을 확인하지 못했습니다.");
  return (data || []).filter((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
    return row.user_id === ownerUserId || metadata.credentialUpdatedBy === ownerUserId;
  }).map((row) => row.id as string).filter(Boolean);
}

export async function getSourceProviderStatus(workspaceIds: string[], provider: string, options: { sourceConnectionIds?: string[] } = {}): Promise<SourceProviderStatus> {
  if (isUserScopedProvider(provider) && options.sourceConnectionIds && options.sourceConnectionIds.length === 0) return { provider, connected: false, connectionStatus: null, count: 0, lastSyncedAt: null, lastRun: null };
  const [documents, connection, run] = await Promise.all([
    (() => { let query = supabaseAdmin.from("cw_source_documents").select("updated_at", { count: "exact" }).in("workspace_id", workspaceIds).eq("source_system", provider).eq("status", "active"); if (options.sourceConnectionIds?.length) query = query.in("source_connection_id", options.sourceConnectionIds); return query.order("updated_at", { ascending: false }).limit(1); })(),
    (() => { let query = supabaseAdmin.from("cw_source_connections").select("status,last_synced_at").in("workspace_id", workspaceIds).eq("provider", provider); if (options.sourceConnectionIds?.length) query = query.in("id", options.sourceConnectionIds); return query.order("last_synced_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(); })(),
    (() => { let query = supabaseAdmin.from("cw_sync_runs").select("status,fetched_count,changed_count,failed_count,error_code,error_message,started_at,completed_at").in("workspace_id", workspaceIds).eq("provider", provider); if (options.sourceConnectionIds?.length) query = query.in("source_connection_id", options.sourceConnectionIds); return query.order("started_at", { ascending: false }).limit(1).maybeSingle(); })(),
  ]);
  if (documents.error) throw new Error("SOT 연결 상태를 불러오지 못했습니다.");
  const count = documents.count || 0;
  const lastRun = run.data ? {
    status: run.data.status,
    fetchedCount: run.data.fetched_count,
    changedCount: run.data.changed_count,
    failedCount: run.data.failed_count,
    errorCode: run.data.error_code,
    errorMessage: run.data.error_message,
    startedAt: run.data.started_at,
    completedAt: run.data.completed_at,
  } : null;
  return {
    provider: provider as "tiro",
    connected: count > 0 || connection.data?.status === "active",
    connectionStatus: connection.data?.status || null,
    count,
    lastSyncedAt: connection.data?.last_synced_at || (documents.data?.[0]?.updated_at as string | undefined) || null,
    lastRun,
  };
}

/** 서버 환경변수 키를 쓰는 관리자 연결. 사용자별 연결은 user_id와 credentials_encrypted로 확장한다. */
export async function ensureSourceConnection(workspaceId: string, provider: string, displayName: string, userId: string | null = null): Promise<SourceConnection> {
  let query = supabaseAdmin.from("cw_source_connections").select("*").eq("workspace_id", workspaceId).eq("provider", provider);
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null);
  const { data: existing } = await query.maybeSingle();
  const row = existing || (await supabaseAdmin.from("cw_source_connections").insert({ workspace_id: workspaceId, provider, user_id: userId, display_name: displayName, scopes: ["read"] }).select("*").single()).data;
  if (!row) throw new Error("SOT 연결을 만들지 못했습니다. create_cw_sot.sql 적용 여부를 확인하세요.");
  return { id: row.id, workspaceId: row.workspace_id, userId: row.user_id, provider: row.provider, displayName: row.display_name, status: row.status, scopes: row.scopes || [], lastSyncedAt: row.last_synced_at, cursor: row.cursor, metadata: row.metadata || {}, credentialsEncrypted: row.credentials_encrypted };
}

export async function updateSourceConnection(id: string, patch: { status?: SourceConnection["status"]; lastSyncedAt?: string; cursor?: string | null }) {
  await supabaseAdmin.from("cw_source_connections").update({
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.lastSyncedAt ? { last_synced_at: patch.lastSyncedAt } : {}),
    ...(patch.cursor !== undefined ? { cursor: patch.cursor } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function startSyncRun(connection: SourceConnection) {
  const { data, error } = await supabaseAdmin.from("cw_sync_runs").insert({ workspace_id: connection.workspaceId, source_connection_id: connection.id, provider: connection.provider, status: "running" }).select("id").single();
  if (error || !data) throw new Error(`동기화 실행 기록을 만들지 못했습니다: ${error?.message || "응답 없음"}`);
  return data.id as string;
}

export async function finishSyncRun(id: string, result: { status: "completed" | "partial" | "failed"; cursor: string | null; fetched: number; changed: number; failed: number; errorCode?: string | null; errorMessage?: string | null; metadata?: Record<string, unknown> }) {
  await supabaseAdmin.from("cw_sync_runs").update({
    status: result.status,
    cursor: result.cursor,
    fetched_count: result.fetched,
    changed_count: result.changed,
    failed_count: result.failed,
    error_code: result.errorCode || null,
    error_message: result.errorMessage || null,
    metadata: result.metadata || {},
    completed_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function hasRunningSync(workspaceId: string, provider: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin.from("cw_sync_runs").select("id").eq("workspace_id", workspaceId).eq("provider", provider).eq("status", "running").gte("started_at", since).limit(1);
  return Boolean(data?.length);
}

export async function listSourceDocuments(workspaceIds: string[], options: { provider?: string; query?: string; limit?: number; sourceConnectionIds?: string[] } = {}) {
  if (isUserScopedProvider(options.provider) && options.sourceConnectionIds && options.sourceConnectionIds.length === 0) return [];
  let request = supabaseAdmin.from("cw_source_documents").select("*").in("workspace_id", workspaceIds).neq("status", "deleted").order("source_updated_at", { ascending: false, nullsFirst: false }).limit(Math.min(100, Math.max(1, options.limit || 50)));
  if (options.provider) request = request.eq("source_system", options.provider);
  if (options.sourceConnectionIds?.length) request = request.in("source_connection_id", options.sourceConnectionIds);
  if (options.query?.trim()) {
    const term = options.query.trim().replace(/[\\%_]/g, "\\$&");
    request = request.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error("SOT 원본 목록을 불러오지 못했습니다.");
  return data || [];
}
