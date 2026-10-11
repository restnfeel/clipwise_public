import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { NextRequest } from "next/server";
import { listStoredTiroNotes, searchStoredTiroNotes, syncTiroNotes } from "@/lib/tiro/clipwise-tiro";
import { listKnowledgeItems } from "@/lib/knowledge/knowledge-service";
import { supabaseAdmin } from "@/lib/supabase";
import { applyMcpCors, mcpCorsPreflight, mcpResourceForRequest, mcpWwwAuthenticate } from "@/lib/mcp/mcp-http";
import { bearerToken } from "@/lib/mcp/mcp-oauth";
import { verifyMcpAccessToken } from "@/lib/mcp/mcp-oauth-store";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";

export const maxDuration = 60;
function result(value: unknown, isError = false) { return { isError, content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }
function createServer(principal: { userId: string; workspaceIds: string[]; scopes: string[] }) {
  const server = new McpServer({ name: "Clipwise", version: "1.0.0" });
  const workspaceIds = principal.workspaceIds;
  server.registerTool("tiro_context", { title: "Tiro 노트 조회", description: "본인 workspace의 Tiro 노트를 조회합니다.", inputSchema: { limit: z.number().int().min(1).max(50).optional() } }, async ({ limit }) => result({ resource: "tiro", notes: await listStoredTiroNotes({ limit: limit || 10, workspaceIds }) }));
  server.registerTool("tiro_search", { title: "Tiro 노트 검색", description: "본인 workspace의 Tiro 노트를 검색합니다.", inputSchema: { query: z.string().min(1).max(2000), limit: z.number().int().min(1).max(50).optional() } }, async ({ query, limit }) => result({ resource: "tiro", query, notes: await searchStoredTiroNotes(query, { limit: limit || 10, workspaceIds }) }));
  server.registerTool("tiro_sync", { title: "Tiro 동기화", description: "승인된 경우 본인의 Tiro 원본을 동기화합니다.", inputSchema: { approved: z.boolean() } }, async ({ approved }) => {
    if (!principal.scopes.includes("mcp:learn")) return result({ code: "FORBIDDEN", message: "mcp:learn 권한이 필요합니다." }, true);
    if (!approved) return result({ code: "NEEDS_APPROVAL", message: "approved:true가 필요합니다." }, true);
    const workspaceId = workspaceIds[0];
    if (!workspaceId) return result({ code: "WORKSPACE_REQUIRED", message: "개인 workspace가 없습니다." }, true);
    return result({ resource: "tiro", sync: await syncTiroNotes({ workspaceId, userId: principal.userId }) });
  });
  server.registerTool("knowledge_search", { title: "지식 검색", description: "검토되었거나 공개된 본인 workspace 지식을 검색합니다.", inputSchema: { query: z.string().min(1).max(2000), limit: z.number().int().min(1).max(50).optional() } }, async ({ query, limit }) => result({ resource: "knowledge", items: await listKnowledgeItems({ workspaceIds, query, limit: limit || 20, readableOnly: true }) }));
  server.registerTool("knowledge_apply", { title: "지식 draft 저장", description: "승인된 지식 draft를 본인 workspace에 저장합니다.", inputSchema: { approved: z.boolean(), title: z.string().min(1).max(300), body: z.string().min(1), summary: z.string().max(5000).optional() } }, async ({ approved, title, body, summary }) => {
    if (!principal.scopes.includes("mcp:learn")) return result({ code: "FORBIDDEN", message: "mcp:learn 권한이 필요합니다." }, true);
    if (!approved) return result({ code: "NEEDS_APPROVAL", message: "approved:true가 필요합니다." }, true);
    const workspaceId = workspaceIds[0];
    if (!workspaceId) return result({ code: "WORKSPACE_REQUIRED", message: "개인 workspace가 없습니다." }, true);
    const { data, error } = await supabaseAdmin.from("cw_knowledge_items").insert({ workspace_id: workspaceId, source_system: "mcp", source_id: `mcp:${crypto.randomUUID()}`, type: "document", title, body, summary: summary || null, status: "draft", visibility: "private", created_by: principal.userId }).select("id,title,status").single();
    if (error || !data) return result({ code: "STORAGE_ERROR", message: "지식 draft를 저장하지 못했습니다." }, true);
    return result({ resource: "knowledge", applied: true, item: data });
  });
  return server;
}
async function handle(request: NextRequest) {
  if (request.method === "OPTIONS") return mcpCorsPreflight();
  const token = bearerToken(request);
  const principal = token ? await verifyMcpAccessToken(token) : null;
  if (!principal || principal.resource !== mcpResourceForRequest(request)) return applyMcpCors(Response.json({ error: "unauthorized", message: "MCP 로그인이 필요합니다." }, { status: 401, headers: { "WWW-Authenticate": mcpWwwAuthenticate(request) } }));
  const workspaceIds = await workspaceIdsForUser(principal.userId);
  if (!workspaceIds.length || !principal.scopes.includes("mcp:read")) return applyMcpCors(Response.json({ error: "unauthorized" }, { status: 401 }));
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await createServer({ ...principal, workspaceIds }).connect(transport);
  return applyMcpCors(await transport.handleRequest(request));
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
