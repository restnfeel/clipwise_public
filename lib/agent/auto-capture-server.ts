import { supabaseAdmin } from "@/lib/supabase";
import { classifyTool, summarizeArgs, summarizeResult, type ToolCall } from "@/lib/agent/auto-capture";
export async function captureToolCall(input: { workspaceId: string; userId?: string | null; call: ToolCall; startedAt: Date; durationMs: number }) {
  if (classifyTool(input.call.tool, input.call.isError) !== "keep") return;
  const result = summarizeResult(input.call.data, input.call.isError);
  await supabaseAdmin.from("cw_agent_runs").insert({ workspace_id: input.workspaceId, user_id: input.userId || null, agent_name: "mcp", task_type: input.call.tool, tool_names: [input.call.tool], input_summary: summarizeArgs(input.call.args), result_summary: result.text, status: input.call.isError ? "failed" : "completed", started_at: input.startedAt.toISOString(), completed_at: new Date().toISOString(), duration_ms: Math.max(0, Math.floor(input.durationMs)) });
}
