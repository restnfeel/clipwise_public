import { supabaseAdmin } from "@/lib/supabase";
import { decryptApiKey, encryptApiKey, needsReencryption, secretFingerprint } from "@/lib/encryption";
import { SOURCE_PROVIDERS, getSourceProviderInfo, type SourceCredentialField, type SourceProviderInfo } from "@/lib/sot/providers";
import { ensureSourceConnection } from "@/lib/sot/sot-service";
import { testSourceCredentials as runCredentialTest } from "@/lib/sot/credential-testers";
import { SourceAdapterError } from "@/lib/sot/types";

/**
 * SOT 공급자 키 해석·저장 (docs/sot/credentials.md).
 * 복호화한 값은 이 모듈과 어댑터 안에서만 쓰고, 응답·로그·에러 메시지에 넣지 않는다.
 */

export type CredentialSource = "db" | "env" | "none";

export type SourceCredentialStatus = {
  provider: string;
  label: string;
  fields: SourceCredentialField[];
  configured: boolean;
  source: CredentialSource;
  publicValues: Record<string, string>;
  fingerprints: Record<string, string>;
  missing: string[];
  updatedAt: string | null;
  updatedBy: string | null;
  connectionStatus: string | null;
  needsReencryption: boolean;
  authMethod: "api_key" | "oauth" | "mcp" | null;
};

export type CredentialTestResult = { ok: true; account?: Record<string, unknown> } | { ok: false; code: string; message: string };

export class SourceCredentialError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) {
    super(message);
    this.name = "SourceCredentialError";
  }
}

type ConnectionRow = { id: string; status: string | null; credentials_encrypted: string | null; metadata: Record<string, unknown> | null };

const envFallbackEnabled = () => false;

function providerWithCredentials(provider: string): SourceProviderInfo {
  const info = getSourceProviderInfo(provider);
  if (!info || !info.credentialFields.length) throw new SourceCredentialError("키를 등록할 수 없는 원본 서비스입니다.", "SOURCE_NOT_SUPPORTED", 404);
  return info;
}

async function loadConnectionRow(workspaceId: string, provider: string, ownerUserId: string | null = null): Promise<ConnectionRow | null> {
  let query = supabaseAdmin.from("cw_source_connections").select("id,status,credentials_encrypted,metadata").eq("workspace_id", workspaceId).eq("provider", provider);
  query = ownerUserId ? query.eq("user_id", ownerUserId) : query.is("user_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new SourceCredentialError("원본 연결 정보를 읽지 못했습니다.", "SERVICE_DB_ERROR", 503);
  return (data as ConnectionRow | null) || null;
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function decryptSecrets(row: ConnectionRow | null): Record<string, string> {
  if (!row?.credentials_encrypted) return {};
  return stringRecord(JSON.parse(decryptApiKey(row.credentials_encrypted)));
}

function envValues(info: SourceProviderInfo): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of info.credentialFields) {
  }
  return values;
}

function missingRequired(info: SourceProviderInfo, values: Record<string, string>) {
  return info.credentialFields.filter((field) => field.required && !values[field.key]).map((field) => field.key);
}

/** 어댑터가 쓸 키. DB 등록값 → (이행 기간) .env → 미설정 오류 순서. */
export async function resolveSourceCredentials(workspaceId: string, provider: string, ownerUserId: string | null = null): Promise<{ values: Record<string, string>; source: CredentialSource }> {
  const info = providerWithCredentials(provider);
  const row = await loadConnectionRow(workspaceId, provider, ownerUserId);
  let values: Record<string, string> = {};
  let source: CredentialSource = "none";
  if (row?.credentials_encrypted) {
    try {
      values = { ...stringRecord(row.metadata?.credentialPublic), ...decryptSecrets(row) };
    } catch {
      throw new SourceAdapterError(`${info.label} 키를 복호화하지 못했습니다. ENCRYPTION_KEY를 확인하거나 키를 다시 등록하세요.`, `${provider.toUpperCase()}_NOT_CONFIGURED`);
    }
    source = "db";
  } else if (envFallbackEnabled()) {
    values = envValues(info);
    if (Object.keys(values).length) source = "env";
  }
  if (missingRequired(info, values).length) {
    throw new SourceAdapterError(`${info.label} 키가 등록되지 않았습니다. 공급자 연결 화면에서 등록하세요.`, `${provider.toUpperCase()}_NOT_CONFIGURED`);
  }
  return { values, source };
}

function buildStatus(info: SourceProviderInfo, row: ConnectionRow | null): SourceCredentialStatus {
  const metadata = row?.metadata || {};
  const hasDb = Boolean(row?.credentials_encrypted);
  const env = !hasDb && envFallbackEnabled() ? envValues(info) : {};
  const publicKeys = new Set(info.credentialFields.filter((field) => !field.secret).map((field) => field.key));
  const publicValues = hasDb
    ? stringRecord(metadata.credentialPublic)
    : Object.fromEntries(Object.entries(env).filter(([key]) => publicKeys.has(key)));
  const fingerprints = hasDb
    ? stringRecord(metadata.credentialFingerprint)
    : Object.fromEntries(info.credentialFields.filter((field) => field.secret && env[field.key]).map((field) => [field.key, secretFingerprint(env[field.key])]));
  const present: Record<string, string> = { ...publicValues, ...Object.fromEntries(Object.keys(fingerprints).map((key) => [key, "set"])) };
  const missing = missingRequired(info, present);
  const source: CredentialSource = hasDb ? "db" : Object.keys(env).length ? "env" : "none";
  return {
    provider: info.id,
    label: info.label,
    fields: info.credentialFields,
    configured: source !== "none" && missing.length === 0,
    source,
    publicValues,
    fingerprints,
    missing,
    updatedAt: typeof metadata.credentialUpdatedAt === "string" ? metadata.credentialUpdatedAt : null,
    updatedBy: typeof metadata.credentialUpdatedByEmail === "string" ? metadata.credentialUpdatedByEmail : null,
    connectionStatus: row?.status || null,
    needsReencryption: hasDb && needsReencryption(row!.credentials_encrypted!),
    authMethod: metadata.authMethod === "oauth" || metadata.authMethod === "mcp" ? metadata.authMethod : hasDb || source === "env" ? "api_key" : null,
  };
}

/** OAuth 콜백이 발급한 토큰을 같은 연결에 저장했다는 표시만 남긴다. 토큰 자체는 credentials_encrypted에만 둔다. */
export async function markSourceConnectionAuth(options: { workspaceId: string; provider: string; ownerUserId: string; authMethod: "oauth" | "mcp"; account?: Record<string, unknown> }) {
  const row = await loadConnectionRow(options.workspaceId, options.provider, options.ownerUserId);
  if (!row) throw new SourceCredentialError("OAuth 연결을 저장할 원본 연결이 없습니다.", "SOURCE_CONNECTION_NOT_FOUND", 404);
  const safeAccount = Object.fromEntries(Object.entries(options.account || {}).filter(([key, value]) => /^(id|name|email|team|workspace|user)$/.test(key) && (typeof value === "string" || typeof value === "number")));
  const metadata = { ...(row.metadata || {}), authMethod: options.authMethod, oauthAccount: safeAccount, oauthConnectedAt: new Date().toISOString() };
  const { error } = await supabaseAdmin.from("cw_source_connections").update({ metadata, status: "active", updated_at: new Date().toISOString() }).eq("id", row.id);
  if (error) throw new SourceCredentialError("OAuth 연결 상태를 저장하지 못했습니다.", "SERVICE_DB_ERROR", 503);
}

export async function listSourceCredentialStatuses(workspaceId: string, ownerUserId: string | null = null): Promise<SourceCredentialStatus[]> {
  const providers = SOURCE_PROVIDERS.filter((provider) => provider.credentialFields.length > 0);
  let query = supabaseAdmin.from("cw_source_connections").select("id,provider,status,credentials_encrypted,metadata").eq("workspace_id", workspaceId).in("provider", providers.map((provider) => provider.id));
  query = ownerUserId ? query.eq("user_id", ownerUserId) : query.is("user_id", null);
  const { data, error } = await query;
  if (error) throw new SourceCredentialError("원본 연결 정보를 읽지 못했습니다.", "SERVICE_DB_ERROR", 503);
  const rows = new Map((data || []).map((row) => [row.provider as string, row as ConnectionRow]));
  return providers.map((info) => buildStatus(info, rows.get(info.id) || null));
}

/** 요청 본문을 카탈로그 선언으로 검증한다. 비밀 항목의 빈 값은 "기존 값 유지". */
function parseInput(info: SourceProviderInfo, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SourceCredentialError("등록할 키 값이 필요합니다.", "INVALID_INPUT");
  const fields = new Map(info.credentialFields.map((field) => [field.key, field]));
  const secrets: Record<string, string> = {};
  const publicValues: Record<string, string | null> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = fields.get(key);
    if (!field) throw new SourceCredentialError(`알 수 없는 항목입니다: ${key}`, "INVALID_INPUT");
    if (raw !== null && typeof raw !== "string") throw new SourceCredentialError(`${field.label} 값은 문자열이어야 합니다.`, "INVALID_INPUT");
    const value = (raw || "").trim();
    if (value.length > 4096) throw new SourceCredentialError(`${field.label} 값이 너무 깁니다.`, "INVALID_INPUT");
    if (value && field.pattern && !new RegExp(field.pattern).test(value)) throw new SourceCredentialError(`${field.label} 형식이 올바르지 않습니다.`, "INVALID_INPUT");
    if (field.secret) { if (value) secrets[key] = value; }
    else publicValues[key] = value || null;
  }
  return { secrets, publicValues };
}

async function logCredentialEvent(event: { workspaceId: string; connectionId: string | null; provider: string; action: "create" | "rotate" | "update_public" | "delete" | "test"; actorUserId: string | null; result?: "ok" | "failed"; fingerprint?: string | null }) {
  const { error } = await supabaseAdmin.from("cw_source_credential_events").insert({ workspace_id: event.workspaceId, source_connection_id: event.connectionId, provider: event.provider, action: event.action, actor_user_id: event.actorUserId, result: event.result || "ok", fingerprint: event.fingerprint || null });
  if (error) console.warn("[SOT credentials] 감사 로그를 남기지 못했습니다.", { provider: event.provider, action: event.action, code: error.code });
}

export async function saveSourceCredentials(options: { workspaceId: string; provider: string; input: unknown; actor: { userId: string | null; email: string | null }; ownerUserId?: string | null }): Promise<SourceCredentialStatus> {
  const info = providerWithCredentials(options.provider);
  const { secrets, publicValues } = parseInput(info, options.input);
  await ensureSourceConnection(options.workspaceId, info.id, info.label, options.ownerUserId || null);
  const row = await loadConnectionRow(options.workspaceId, info.id, options.ownerUserId || null);
  if (!row) throw new SourceCredentialError("원본 연결을 만들지 못했습니다.", "SERVICE_DB_ERROR", 503);

  let existingSecrets: Record<string, string> = {};
  try {
    existingSecrets = decryptSecrets(row);
  } catch {
    const secretKeys = info.credentialFields.filter((field) => field.secret).map((field) => field.key);
    if (secretKeys.some((key) => !secrets[key])) throw new SourceCredentialError("기존 키를 복호화할 수 없습니다. 비밀 항목을 모두 다시 입력하세요.", "REENTER_SECRETS");
  }
  const mergedSecrets = { ...existingSecrets, ...secrets };
  const mergedPublic: Record<string, string> = { ...stringRecord(row.metadata?.credentialPublic) };
  for (const [key, value] of Object.entries(publicValues)) { if (value) mergedPublic[key] = value; else delete mergedPublic[key]; }
  const missing = missingRequired(info, { ...mergedPublic, ...mergedSecrets });
  if (missing.length) {
    const labels = info.credentialFields.filter((field) => missing.includes(field.key)).map((field) => field.label);
    throw new SourceCredentialError(`필수 항목을 입력하세요: ${labels.join(", ")}`, "MISSING_FIELDS");
  }

  const fingerprints = Object.fromEntries(Object.entries(mergedSecrets).map(([key, value]) => [key, secretFingerprint(value)]));
  const action = !row.credentials_encrypted ? "create" : Object.keys(secrets).length ? "rotate" : "update_public";
  const now = new Date().toISOString();
  const metadata = { ...(row.metadata || {}), credentialPublic: mergedPublic, credentialFingerprint: fingerprints, credentialUpdatedAt: now, credentialUpdatedBy: options.actor.userId, credentialUpdatedByEmail: options.actor.email };
  const encrypted = encryptApiKey(JSON.stringify(mergedSecrets));
  const { error } = await supabaseAdmin.from("cw_source_connections").update({ credentials_encrypted: encrypted, status: "active", metadata, updated_at: now }).eq("id", row.id);
  if (error) throw new SourceCredentialError("키를 저장하지 못했습니다.", "SERVICE_DB_ERROR", 503);
  await logCredentialEvent({ workspaceId: options.workspaceId, connectionId: row.id, provider: info.id, action, actorUserId: options.actor.userId, fingerprint: Object.values(fingerprints).join(",") });
  return buildStatus(info, { ...row, status: "active", credentials_encrypted: encrypted, metadata });
}

export async function deleteSourceCredentials(options: { workspaceId: string; provider: string; actorUserId: string | null; ownerUserId?: string | null }): Promise<SourceCredentialStatus> {
  const info = providerWithCredentials(options.provider);
  const row = await loadConnectionRow(options.workspaceId, info.id, options.ownerUserId || null);
  if (!row?.credentials_encrypted) return buildStatus(info, row);
  const metadata = { ...(row.metadata || {}) };
  for (const key of ["credentialPublic", "credentialFingerprint", "credentialUpdatedAt", "credentialUpdatedBy", "credentialUpdatedByEmail"]) delete metadata[key];
  const { error } = await supabaseAdmin.from("cw_source_connections").update({ credentials_encrypted: null, status: "revoked", metadata, updated_at: new Date().toISOString() }).eq("id", row.id);
  if (error) throw new SourceCredentialError("키를 삭제하지 못했습니다.", "SERVICE_DB_ERROR", 503);
  await logCredentialEvent({ workspaceId: options.workspaceId, connectionId: row.id, provider: info.id, action: "delete", actorUserId: options.actorUserId });
  return buildStatus(info, { ...row, status: "revoked", credentials_encrypted: null, metadata });
}

/** 입력값이 있으면 저장값과 합쳐서, 없으면 저장값(또는 이행 기간 .env)으로 연결을 확인한다. 저장하지 않는다. */
export async function testSourceCredentials(options: { workspaceId: string; provider: string; input?: unknown; actorUserId: string | null; ownerUserId?: string | null }): Promise<CredentialTestResult> {
  const info = providerWithCredentials(options.provider);
  const row = await loadConnectionRow(options.workspaceId, info.id, options.ownerUserId || null);
  let values: Record<string, string>;
  if (options.input && typeof options.input === "object" && Object.keys(options.input).length) {
    const { secrets, publicValues } = parseInput(info, options.input);
    let base: Record<string, string> = {};
    try { base = (await resolveSourceCredentials(options.workspaceId, info.id, options.ownerUserId || null)).values; } catch { base = {}; }
    values = { ...base, ...secrets };
    for (const [key, value] of Object.entries(publicValues)) { if (value) values[key] = value; else delete values[key]; }
  } else {
    try { values = (await resolveSourceCredentials(options.workspaceId, info.id, options.ownerUserId || null)).values; }
    catch (error) { return { ok: false, code: error instanceof SourceAdapterError ? error.code : "NOT_CONFIGURED", message: error instanceof Error ? error.message : "키가 등록되지 않았습니다." }; }
  }
  const missing = missingRequired(info, values);
  if (missing.length) {
    const labels = info.credentialFields.filter((field) => missing.includes(field.key)).map((field) => field.label);
    return { ok: false, code: "MISSING_FIELDS", message: `필수 항목을 입력하세요: ${labels.join(", ")}` };
  }
  const result = await runCredentialTest(info.id, options.workspaceId, values);
  await logCredentialEvent({ workspaceId: options.workspaceId, connectionId: row?.id || null, provider: info.id, action: "test", actorUserId: options.actorUserId, result: result.ok ? "ok" : "failed" });
  return result;
}
