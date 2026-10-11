import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MCP_SCOPES = ["mcp:read", "mcp:learn"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export function canonicalMcpResource(baseUrl: string): string {
  return new URL("/api/mcp", baseUrl).toString();
}

export function canonicalAudience(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export function createMcpSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashMcpSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function pkceS256(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (verifier.length < 43 || verifier.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(verifier)) return false;
  const actual = Buffer.from(pkceS256(verifier));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeMcpScopes(value: string | undefined): McpScope[] {
  // Claude는 scope를 요청하지 않으므로 기본값에 지식 draft 저장을 포함한다. 공개는 사람이 검토한다.
  if (!value?.trim()) return [...MCP_SCOPES];
  const requested = new Set(value.trim().split(/\s+/));
  const scopes = MCP_SCOPES.filter((scope) => requested.has(scope));
  return scopes.length ? [...scopes] : ["mcp:read"];
}

export function areMcpScopesSupported(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return value.trim().split(/\s+/).every((scope) => scope === "offline_access" || MCP_SCOPES.includes(scope as McpScope));
}

export function isValidPkceChallenge(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** 운영 프록시가 쿼리 속 127.0.0.1을 localhost로 바꿔 전달하므로 루프백 호스트는 같은 값으로 비교한다. */
function canonicalMcpRedirectUri(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/^[\\'"]+/, "").replace(/[\\'"]+$/, "");
  try {
    const url = new URL(decodeURIComponent(cleaned));
    if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) url.hostname = "localhost";
    return url.toString();
  } catch {
    return cleaned;
  }
}

export function isSameMcpRedirectUri(registered: string, requested: string): boolean {
  return canonicalMcpRedirectUri(registered) === canonicalMcpRedirectUri(requested);
}

export function findRegisteredMcpRedirectUri(registered: string[], requested: string): string | null {
  return registered.find((value) => isSameMcpRedirectUri(value, requested)) ?? null;
}

export function isAllowedMcpRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function bearerToken(req: Request): string | null {
  const value = req.headers.get("authorization")?.trim() ?? "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() || null : null;
}
