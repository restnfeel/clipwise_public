import { supabaseAdmin } from "@/lib/supabase";

export const REQUIRED_PUBLIC_TABLES = [
  "users", "user_withdrawal_history", "cw_workspaces", "cw_workspace_memberships",
  "cw_source_connections", "cw_source_documents", "cw_source_revisions", "cw_sync_runs",
  "cw_source_credential_events", "cw_tiro_notes", "cw_knowledge_categories", "cw_knowledge_items",
  "cw_knowledge_item_events", "cw_knowledge_links", "cw_blog_posts", "cw_agent_runs",
  "cw_agent_feedback", "cw_agent_improvement_candidates", "cw_mcp_access_keys", "cw_mcp_oauth_clients",
  "cw_mcp_oauth_codes", "cw_mcp_sessions",
] as const;

const MISSING_CODES = new Set(["42P01", "PGRST205"]);

export async function getDatabaseSetupStatus() {
  const results = await Promise.all(REQUIRED_PUBLIC_TABLES.map(async (table) => {
    const { error } = await supabaseAdmin.from(table).select("id").limit(1);
    return { table, error };
  }));
  const missing = results.filter(({ error }) => error && MISSING_CODES.has(error.code || "")).map(({ table }) => table);
  const unavailable = results.some(({ error }) => error && !MISSING_CODES.has(error.code || ""));
  return { ready: missing.length === 0 && !unavailable, missing, unavailable };
}

export function databaseSetupRedirectUrl() {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/setup?reason=missing-tables`;
}
