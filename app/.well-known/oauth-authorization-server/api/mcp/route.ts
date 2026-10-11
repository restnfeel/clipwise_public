import { NextRequest } from "next/server";
import { applyMcpCors, mcpAuthorizationServerMetadata, mcpCorsPreflight } from "@/lib/mcp/mcp-http";

export function GET(req: NextRequest) { return applyMcpCors(Response.json(mcpAuthorizationServerMetadata(req), { headers: { "Cache-Control": "no-store" } })); }
export function OPTIONS() { return mcpCorsPreflight(); }
