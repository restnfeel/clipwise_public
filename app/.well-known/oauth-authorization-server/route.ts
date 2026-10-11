import type { NextRequest } from "next/server";
import { applyMcpCors, mcpAuthorizationServerMetadata, mcpCorsPreflight } from "@/lib/mcp/mcp-http";

export function OPTIONS() { return mcpCorsPreflight(); }
export function GET(req: NextRequest) { return applyMcpCors(Response.json(mcpAuthorizationServerMetadata(req))); }
