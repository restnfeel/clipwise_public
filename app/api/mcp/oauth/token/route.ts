import { NextRequest } from "next/server";
import { mcpCorsPreflight, mcpResourceForRequest, oauthError, applyMcpCors } from "@/lib/mcp/mcp-http";
import { isSameMcpRedirectUri, verifyPkceS256 } from "@/lib/mcp/mcp-oauth";
import { consumeMcpAuthorizationCode, createMcpSession, getMcpOauthClient, rotateMcpRefreshToken } from "@/lib/mcp/mcp-oauth-store";

function tokens(value: { accessToken: string; refreshToken: string; expiresIn: number; scopes?: string[] }) { return applyMcpCors(Response.json({ access_token: value.accessToken, refresh_token: value.refreshToken, token_type: "Bearer", expires_in: value.expiresIn, scope: value.scopes?.join(" ") ?? "mcp:read" }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } })); }
export async function POST(req: NextRequest) {
  const form = await req.formData(); const grant = String(form.get("grant_type") ?? ""); const clientId = String(form.get("client_id") ?? "");
  if (!clientId || !(await getMcpOauthClient(clientId))) return oauthError("invalid_client", "client_id가 유효하지 않습니다.", 401);
  if (grant === "authorization_code") {
    const code = String(form.get("code") ?? ""); const consumed = code ? await consumeMcpAuthorizationCode(code) : null;
    const resource = String(form.get("resource") ?? ""); const verifier = String(form.get("code_verifier") ?? ""); const redirectUri = String(form.get("redirect_uri") ?? "");
    if (!consumed || consumed.client_id !== clientId || !isSameMcpRedirectUri(consumed.redirect_uri, redirectUri) || consumed.resource !== resource || resource !== mcpResourceForRequest(req) || !verifyPkceS256(verifier, consumed.code_challenge)) return oauthError("invalid_grant", "authorization code 또는 PKCE가 유효하지 않습니다.");
    const issued = await createMcpSession({ userId: consumed.user_id, clientId, resource, scopes: consumed.scopes.filter((s): s is "mcp:read" | "mcp:learn" => s === "mcp:read" || s === "mcp:learn") }); return tokens({ ...issued, scopes: consumed.scopes });
  }
  if (grant === "refresh_token") { const rotated = await rotateMcpRefreshToken(clientId, String(form.get("refresh_token") ?? "")); return rotated ? tokens({ ...rotated, scopes: rotated.scopes }) : oauthError("invalid_grant", "refresh token이 유효하지 않습니다."); }
  return oauthError("unsupported_grant_type", "지원하지 않는 grant_type입니다.");
}
export function OPTIONS() { return mcpCorsPreflight(); }
