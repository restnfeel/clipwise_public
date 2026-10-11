import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const MCP_ACCESS_COOKIE = "clipwise_mcp_access";

export function createMcpAccessKey() {
  const key = `cw_mcp_${randomBytes(32).toString("base64url")}`;
  return { key, hash: hashMcpAccessKey(key), prefix: key.slice(0, 16) };
}

export function hashMcpAccessKey(key: string) {
  return createHash("sha256").update(key.trim(), "utf8").digest("hex");
}

export async function verifyMcpAccessKey(request: Request) {
  const cookieKey = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${MCP_ACCESS_COOKIE}=([^;]+)`))?.[1] ?? null;
  const key = request.headers.get("x-clipwise-mcp-key")?.trim() ||
    request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ||
    cookieKey;
  if (!key) return null;
  const { data } = await supabaseAdmin.from("cw_mcp_access_keys").select("id, user_id").eq("key_hash", hashMcpAccessKey(key)).is("revoked_at", null).maybeSingle();
  if (!data) return null;
  void supabaseAdmin.from("cw_mcp_access_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { keyId: data.id as string, userId: data.user_id as string };
}
