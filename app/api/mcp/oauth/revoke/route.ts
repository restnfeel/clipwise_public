import { NextRequest } from "next/server";
import { applyMcpCors, mcpCorsPreflight } from "@/lib/mcp/mcp-http";
import { revokeMcpToken } from "@/lib/mcp/mcp-oauth-store";
export async function POST(req: NextRequest) { const form = await req.formData(); const token = String(form.get("token") ?? ""); if (token) await revokeMcpToken(token); return applyMcpCors(new Response(null, { status: 200 })); }
export function OPTIONS() { return mcpCorsPreflight(); }
