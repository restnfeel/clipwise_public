import { NextRequest } from "next/server";
import { applyMcpCors, mcpCorsPreflight, mcpProtectedResourceMetadataBody } from "@/lib/mcp/mcp-http";

export function GET(req: NextRequest) { return applyMcpCors(Response.json(mcpProtectedResourceMetadataBody(req), { headers: { "Cache-Control": "no-store" } })); }
export function OPTIONS() { return mcpCorsPreflight(); }
