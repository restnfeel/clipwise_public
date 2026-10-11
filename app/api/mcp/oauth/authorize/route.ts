import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase";
import { mcpLoginRedirectUrl, mcpResourceForRequest, oauthError } from "@/lib/mcp/mcp-http";
import { areMcpScopesSupported, findRegisteredMcpRedirectUri, isValidPkceChallenge, normalizeMcpScopes } from "@/lib/mcp/mcp-oauth";
import { getMcpOauthClient, issueMcpAuthorizationCode } from "@/lib/mcp/mcp-oauth-store";
import { verifyMcpAccessKey } from "@/lib/mcp/mcp-access-key";

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c); }
async function validate(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const clientId = p.get("client_id")?.trim() ?? "";
  const redirectUri = p.get("redirect_uri")?.trim() ?? "";
  const state = p.get("state") ?? "";
  const challenge = p.get("code_challenge")?.trim() ?? "";
  const resource = p.get("resource")?.trim() || mcpResourceForRequest(req);
  const scope = p.get("scope") ?? undefined;
  if (p.get("response_type") !== "code" || p.get("code_challenge_method") !== "S256" || !clientId || !redirectUri || !state || !isValidPkceChallenge(challenge) || resource !== mcpResourceForRequest(req) || !areMcpScopesSupported(scope)) {
    console.warn("[mcp/oauth] invalid authorize parameters", {
      responseType: p.get("response_type"),
      challengeMethod: p.get("code_challenge_method"),
      hasClientId: Boolean(clientId),
      hasRedirectUri: Boolean(redirectUri),
      hasState: Boolean(state),
      validPkce: isValidPkceChallenge(challenge),
      resource,
      expectedResource: mcpResourceForRequest(req),
      scopesSupported: areMcpScopesSupported(scope),
    });
    const reason = p.get("response_type") !== "code" ? "response_type=code가 필요합니다." :
      p.get("code_challenge_method") !== "S256" ? "code_challenge_method=S256이 필요합니다." :
      !clientId ? "client_id가 없습니다." : !redirectUri ? "redirect_uri가 없습니다." :
      !state ? "state가 없습니다." : !isValidPkceChallenge(challenge) ? "code_challenge가 올바르지 않습니다." :
      resource !== mcpResourceForRequest(req) ? "resource가 Clipwise MCP URL과 일치하지 않습니다." : "scope가 지원되지 않습니다.";
    return { ok: false as const, reason };
  }
  const client = await getMcpOauthClient(clientId);
  if (!client) {
    console.warn("[mcp/oauth] client not found", { clientId });
    return { ok: false as const, reason: "등록되지 않았거나 만료된 client_id입니다." };
  }
  const registeredRedirect = findRegisteredMcpRedirectUri(client.redirectUris, redirectUri);
  if (!registeredRedirect) {
    console.warn("[mcp/oauth] redirect URI mismatch", { clientId, redirectUri, registered: client.redirectUris });
    return { ok: false as const, reason: `등록된 redirect_uri와 일치하지 않습니다. 요청값=${JSON.stringify(redirectUri)} 등록값=${client.redirectUris.map((value) => JSON.stringify(value)).join(" | ")}` };
  }
  return { ok: true as const, client, clientId, redirectUri: registeredRedirect, state, challenge, resource, scope };
}

async function resolveClipwiseUserId(session: { user?: { id?: string } } | null) {
  const provider = (session as { provider?: string } | null)?.provider;
  const userId = session?.user?.id?.trim();
  if (!userId) return null;
  const column = provider === "google" ? "google_id" : "kakao_id";
  const { data } = await supabaseAdmin.from("users").select("id").eq(column, userId).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function resolveAuthorizedUserId(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return resolveClipwiseUserId(session);
  const keyPrincipal = await verifyMcpAccessKey(req);
  return keyPrincipal?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const valid = await validate(req); if (!valid.ok) return oauthError("invalid_request", valid.reason);
  const userId = await resolveAuthorizedUserId(req);
  if (!userId) return Response.redirect(mcpLoginRedirectUrl(req));
  const action = escapeHtml(req.nextUrl.pathname + req.nextUrl.search);
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Clipwise MCP 연결 승인</title></head><body style="font-family:system-ui;background:#f7f3ec;color:#302a25;display:grid;place-items:center;min-height:100vh"><main style="max-width:520px;border:1px solid #ded6ca;border-radius:18px;padding:32px;background:#fffdf9;box-shadow:0 12px 40px #5b463322"><p style="color:#9a6b32">CLIPWISE · MCP</p><h1>${escapeHtml(valid.client.clientName)} 연결 승인</h1><p>Claude가 Clipwise의 Tiro·지식 도구를 사용하도록 허용합니다.</p><p>권한: ${escapeHtml(normalizeMcpScopes(valid.scope).map((scope) => scope === "mcp:learn" ? "지식 draft 저장(공개는 사람이 검토 후)" : "지식·노트 조회").join(", "))}</p><form method="post" action="${action}"><button name="decision" value="approve" style="padding:12px 18px;background:#9a6b32;color:white;border:0;border-radius:9px;font-weight:700">연결 승인</button> <button name="decision" value="deny" style="padding:12px 18px;background:transparent;border:1px solid #a99b8c;border-radius:9px">거부</button></form></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const valid = await validate(req); if (!valid.ok) return oauthError("invalid_request", valid.reason);
  const userId = await resolveAuthorizedUserId(req); if (!userId) return oauthError("access_denied", "MCP 인증키가 필요합니다.", 401);
  const form = await req.formData(); const redirect = new URL(valid.redirectUri); redirect.searchParams.set("state", valid.state);
  if (form.get("decision") !== "approve") { redirect.searchParams.set("error", "access_denied"); return Response.redirect(redirect); }
  const code = await issueMcpAuthorizationCode({ userId, clientId: valid.clientId, redirectUri: valid.redirectUri, codeChallenge: valid.challenge, resource: valid.resource, scopes: normalizeMcpScopes(valid.scope) });
  redirect.searchParams.set("code", code); return Response.redirect(redirect);
}
export function OPTIONS() { return new Response(null, { status: 204 }); }
