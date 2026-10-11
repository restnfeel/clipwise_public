import { supabaseAdmin } from "@/lib/supabase";
import { createMcpSecret, hashMcpSecret, type McpScope } from "@/lib/mcp/mcp-oauth";

export type McpOauthClient = { id: string; clientName: string; redirectUris: string[] };
export type McpPrincipal = { sessionId: string; userId: string; clientId: string; resource: string; scopes: McpScope[]; workspaceIds?: string[] };

type CodeRow = { user_id: string; client_id: string; redirect_uri: string; code_challenge: string; resource: string; scopes: string[] };
type SessionRow = { id: string; user_id: string; client_id: string; resource: string; scopes: string[] };

function normalizeRedirectUris(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("{") && text.endsWith("}")) return text.slice(1, -1).split(",").map((item) => item.replace(/^"|"$/g, "").trim()).filter(Boolean);
    return text ? [text] : [];
  }
  return [];
}

function scopes(value: string[]): McpScope[] {
  return value.filter((scope): scope is McpScope => scope === "mcp:read" || scope === "mcp:learn");
}

export async function registerMcpOauthClient(input: { clientName: string; redirectUris: string[] }): Promise<McpOauthClient> {
  const { data, error } = await supabaseAdmin.from("cw_mcp_oauth_clients").insert({ client_name: input.clientName, redirect_uris: input.redirectUris }).select("id, client_name, redirect_uris").single();
  if (error || !data) throw new Error("MCP OAuth client 등록에 실패했습니다.");
  const row = data as unknown as { id: string; client_name: string; redirect_uris: string[] };
  return { id: row.id, clientName: row.client_name, redirectUris: row.redirect_uris };
}

export async function getMcpOauthClient(clientId: string): Promise<McpOauthClient | null> {
  const { data } = await supabaseAdmin.from("cw_mcp_oauth_clients").select("id, client_name, redirect_uris, expires_at").eq("id", clientId).is("revoked_at", null).maybeSingle();
  if (!data) return null;
  const row = data as unknown as { id: string; client_name: string; redirect_uris: unknown; expires_at?: string };
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return null;
  return { id: row.id, clientName: row.client_name, redirectUris: normalizeRedirectUris(row.redirect_uris) };
}

export async function issueMcpAuthorizationCode(input: { userId: string; clientId: string; redirectUri: string; codeChallenge: string; resource: string; scopes: McpScope[] }): Promise<string> {
  const code = createMcpSecret();
  const { error } = await supabaseAdmin.from("cw_mcp_oauth_codes").insert({ user_id: input.userId, client_id: input.clientId, code_hash: hashMcpSecret(code), redirect_uri: input.redirectUri, code_challenge: input.codeChallenge, resource: input.resource, scopes: input.scopes, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
  if (error) throw new Error("MCP authorization code 발급에 실패했습니다.");
  return code;
}

export async function consumeMcpAuthorizationCode(code: string): Promise<CodeRow | null> {
  const { data, error } = await supabaseAdmin.rpc("consume_cw_mcp_oauth_code", { p_code_hash: hashMcpSecret(code) });
  if (error) throw new Error("MCP authorization code 검증에 실패했습니다.");
  return ((data as unknown as CodeRow[] | null) ?? [])[0] ?? null;
}

export async function createMcpSession(input: { userId: string; clientId: string; resource: string; scopes: McpScope[] }) {
  const accessToken = createMcpSecret();
  const refreshToken = createMcpSecret(48);
  const expiresIn = 60 * 60;
  const { error } = await supabaseAdmin.from("cw_mcp_sessions").insert({ user_id: input.userId, client_id: input.clientId, access_token_hash: hashMcpSecret(accessToken), refresh_token_hash: hashMcpSecret(refreshToken), resource: input.resource, scopes: input.scopes, access_expires_at: new Date(Date.now() + expiresIn * 1_000).toISOString(), refresh_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString() });
  if (error) throw new Error("MCP session 발급에 실패했습니다.");
  return { accessToken, refreshToken, expiresIn };
}

export async function verifyMcpAccessToken(token: string): Promise<McpPrincipal | null> {
  const { data } = await supabaseAdmin.from("cw_mcp_sessions").select("id, user_id, client_id, resource, scopes").eq("access_token_hash", hashMcpSecret(token)).is("revoked_at", null).gt("access_expires_at", new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const row = data as unknown as SessionRow;
  void supabaseAdmin.from("cw_mcp_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { sessionId: row.id, userId: row.user_id, clientId: row.client_id, resource: row.resource, scopes: scopes(row.scopes) };
}

export async function rotateMcpRefreshToken(clientId: string, refreshToken: string) {
  const accessToken = createMcpSecret();
  const nextRefreshToken = createMcpSecret(48);
  const expiresIn = 60 * 60;
  const { data, error } = await supabaseAdmin.rpc("rotate_cw_mcp_refresh_token", { p_client_id: clientId, p_refresh_hash: hashMcpSecret(refreshToken), p_access_hash: hashMcpSecret(accessToken), p_next_refresh_hash: hashMcpSecret(nextRefreshToken), p_access_expires_at: new Date(Date.now() + expiresIn * 1_000).toISOString(), p_refresh_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString() });
  if (error) throw new Error("MCP refresh token 회전에 실패했습니다.");
  const row = ((data as unknown as SessionRow[] | null) ?? [])[0];
  return row ? { accessToken, refreshToken: nextRefreshToken, expiresIn, scopes: scopes(row.scopes) } : null;
}

export async function revokeMcpToken(token: string) {
  await supabaseAdmin.from("cw_mcp_sessions").update({ revoked_at: new Date().toISOString() }).or(`access_token_hash.eq.${hashMcpSecret(token)},refresh_token_hash.eq.${hashMcpSecret(token)}`);
}
