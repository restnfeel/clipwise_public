import type { NextRequest } from "next/server";
import { canonicalMcpResource } from "@/lib/mcp/mcp-oauth";

export function mcpPublicBaseUrl(req: NextRequest): string {
  const configured = process.env.MCP_PUBLIC_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (configured) {
    const configuredOrigin = new URL(configured).origin;
    const hostname = new URL(configuredOrigin).hostname;
    if (hostname !== "0.0.0.0" && hostname !== "127.0.0.1" && hostname !== "localhost") return configuredOrigin;
  }
  // Cloudtype/프록시가 내부 origin(0.0.0.0:3000)을 전달해도 공개 OAuth 주소는 운영 도메인이어야 합니다.
  return req.nextUrl.origin;
}

export function mcpResourceForRequest(req: NextRequest): string {
  return canonicalMcpResource(mcpPublicBaseUrl(req));
}

export function mcpLoginRedirectUrl(req: NextRequest): URL {
  const login = new URL("/mcp-auth", mcpPublicBaseUrl(req));
  const callback = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  login.searchParams.set("callbackUrl", callback);
  return login;
}

export function mcpProtectedResourceMetadataBody(req: NextRequest) {
  const baseUrl = mcpPublicBaseUrl(req);
  return {
    resource: mcpResourceForRequest(req),
    authorization_servers: [baseUrl],
    scopes_supported: ["mcp:read", "mcp:learn"],
    bearer_methods_supported: ["header"],
  };
}

export function mcpAuthorizationServerMetadata(req: NextRequest): Record<string, unknown> {
  const issuer = mcpPublicBaseUrl(req);
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    registration_endpoint: `${issuer}/api/mcp/oauth/register`,
    revocation_endpoint: `${issuer}/api/mcp/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp:read", "mcp:learn"],
  };
}

export function oauthError(error: string, description: string, status = 400): Response {
  return applyMcpCors(Response.json({ error, error_description: description }, { status }));
}

export function mcpCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, mcp-session-id, Last-Event-ID",
    "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id, mcp-session-id",
    "Access-Control-Max-Age": "86400",
  };
}

export function applyMcpCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(mcpCorsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function mcpCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: mcpCorsHeaders() });
}

export function mcpWwwAuthenticate(req: NextRequest): string {
  return `Bearer error="invalid_token", resource_metadata="${mcpPublicBaseUrl(req)}/.well-known/oauth-protected-resource/api/mcp", scope="mcp:read mcp:learn"`;
}
