import { NextRequest } from "next/server";
import { applyMcpCors, mcpCorsPreflight, oauthError } from "@/lib/mcp/mcp-http";
import { isAllowedMcpRedirectUri } from "@/lib/mcp/mcp-oauth";
import { registerMcpOauthClient } from "@/lib/mcp/mcp-oauth-store";

export async function POST(req: NextRequest) {
  let body: { client_name?: unknown; redirect_uris?: unknown };
  try { body = await req.json(); } catch { return oauthError("invalid_request", "JSON 요청이 필요합니다."); }
  const clientName = typeof body.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 200) : "MCP Client";
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((v): v is string => typeof v === "string").map((v) => v.trim().replace(/^[\\'"]+/, "").replace(/[\\'"]+$/, "")) : [];
  if (!redirectUris.length || redirectUris.length > 8 || redirectUris.some((uri) => !isAllowedMcpRedirectUri(uri))) return oauthError("invalid_client_metadata", "redirect_uris가 올바르지 않습니다.");
  try { const client = await registerMcpOauthClient({ clientName, redirectUris }); return applyMcpCors(Response.json({ client_id: client.id, client_name: client.clientName, redirect_uris: client.redirectUris, token_endpoint_auth_method: "none" }, { status: 201 })); } catch { return oauthError("server_error", "OAuth client 등록에 실패했습니다.", 500); }
}
export function OPTIONS() { return mcpCorsPreflight(); }
