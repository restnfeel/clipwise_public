import { NextRequest, NextResponse } from "next/server";
import { MCP_ACCESS_COOKIE, hashMcpAccessKey } from "@/lib/mcp/mcp-access-key";
import { supabaseAdmin } from "@/lib/supabase";

function safeCallback(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/api/mcp/oauth/authorize")) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { key?: unknown; callbackUrl?: unknown };
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const callbackUrl = safeCallback(body.callbackUrl);
  if (!key || !callbackUrl) return NextResponse.json({ error: "유효한 MCP 인증 요청이 아닙니다." }, { status: 400 });
  const { data } = await supabaseAdmin.from("cw_mcp_access_keys").select("id").eq("key_hash", hashMcpAccessKey(key)).is("revoked_at", null).maybeSingle();
  if (!data) return NextResponse.json({ error: "MCP 인증키가 올바르지 않거나 폐기되었습니다." }, { status: 401 });
  const response = NextResponse.json({ redirectTo: callbackUrl });
  response.cookies.set(MCP_ACCESS_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
