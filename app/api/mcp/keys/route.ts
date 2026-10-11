import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { createMcpAccessKey, hashMcpAccessKey } from "@/lib/mcp/mcp-access-key";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const { data, error } = await supabaseAdmin.from("cw_mcp_access_keys").select("id,key_prefix,created_at,last_used_at,revoked_at").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "MCP 키를 불러오지 못했습니다.", code: "STORAGE_ERROR" }, { status: 503 });
  return NextResponse.json({ keys: data || [], mcpUrl: `${process.env.MCP_PUBLIC_BASE_URL || ""}/api/mcp` });
}
export async function POST(_request: NextRequest) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const issued = createMcpAccessKey();
  const { data, error } = await supabaseAdmin.from("cw_mcp_access_keys").insert({ user_id: auth.userId, key_hash: hashMcpAccessKey(issued.key), key_prefix: issued.prefix }).select("id,key_prefix,created_at").single();
  if (error || !data) return NextResponse.json({ error: "MCP 키를 발급하지 못했습니다.", code: "STORAGE_ERROR" }, { status: 503 });
  return NextResponse.json({ key: issued.key, accessKey: data }, { status: 201 });
}
export async function DELETE(request: NextRequest) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "폐기할 키가 필요합니다.", code: "INVALID_INPUT" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("cw_mcp_access_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId).is("revoked_at", null).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "MCP 키를 폐기하지 못했습니다.", code: "STORAGE_ERROR" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "MCP 키를 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
