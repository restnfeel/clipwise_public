import { supabaseAdmin } from "@/lib/supabase";

function cleanText(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
}

function cleanUuidList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item)).slice(0, 100) : [];
}

export async function buildContextPack(input: { workspaceId: string; query?: string; limit?: number }) {
  const limit = Math.min(30, Math.max(1, input.limit || 10));
  let request = supabaseAdmin
    .from("cw_knowledge_items")
    .select("id,title,summary,body,topics,decisions,action_items,source_system,source_id,source_updated_at,updated_at,status,visibility")
    .eq("workspace_id", input.workspaceId)
    .in("status", ["reviewed", "published"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  const query = input.query?.trim();
  if (query) {
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    request = request.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%,body.ilike.%${escaped}%`);
  }
  const [{ data: items, error: itemError }, { data: improvements, error: improvementError }] = await Promise.all([
    request,
    supabaseAdmin
      .from("cw_agent_improvement_candidates")
      .select("id,instruction,reason,source_ids,created_at")
      .eq("workspace_id", input.workspaceId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (itemError) throw itemError;
  if (improvementError && improvementError.code !== "42P01" && improvementError.code !== "PGRST205") throw improvementError;
  return {
    workspaceId: input.workspaceId,
    query: query || null,
    generatedAt: new Date().toISOString(),
    instructions: "제공된 지식과 출처만 사용하고, 답변에 sourceIds를 포함하세요.",
    items: items || [],
    improvements: improvements || [],
  };
}

export async function startAgentRun(input: { workspaceId: string; userId?: string | null; agentName?: string; taskType?: string; inputSummary?: string | null; toolNames?: string[]; sourceIds?: string[] }) {
  const { data, error } = await supabaseAdmin.from("cw_agent_runs").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId || null,
    agent_name: input.agentName || "customer-agent",
    task_type: input.taskType || "question",
    input_summary: cleanText(input.inputSummary),
    tool_names: (input.toolNames || []).filter(Boolean).slice(0, 50),
    source_ids: cleanUuidList(input.sourceIds),
    status: "started",
  }).select("*").single();
  if (error || !data) throw error || new Error("에이전트 실행을 기록하지 못했습니다.");
  return data;
}

export async function completeAgentRun(input: { workspaceId: string; runId: string; status: "completed" | "failed" | "cancelled"; resultSummary?: string | null; errorCode?: string | null; sourceIds?: string[]; durationMs?: number | null }) {
  const { data: current } = await supabaseAdmin.from("cw_agent_runs").select("started_at").eq("id", input.runId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (!current) throw new Error("에이전트 실행 기록을 찾을 수 없습니다.");
  const duration = input.durationMs ?? Math.max(0, Date.now() - new Date(current.started_at).getTime());
  const { data, error } = await supabaseAdmin.from("cw_agent_runs").update({
    status: input.status,
    result_summary: cleanText(input.resultSummary),
    error_code: cleanText(input.errorCode, 120),
    source_ids: cleanUuidList(input.sourceIds),
    completed_at: new Date().toISOString(),
    duration_ms: Math.min(2_147_483_647, Math.max(0, Math.floor(duration))),
  }).eq("id", input.runId).eq("workspace_id", input.workspaceId).select("*").single();
  if (error || !data) throw error || new Error("에이전트 실행을 완료 처리하지 못했습니다.");
  return data;
}

export async function recordAgentFeedback(input: { workspaceId: string; runId?: string | null; userId?: string | null; rating: "good" | "needs_improvement" | "incorrect" | "missing_source"; comment?: string | null; sourceIds?: string[] }) {
  const sourceIds = cleanUuidList(input.sourceIds);
  const { data, error } = await supabaseAdmin.from("cw_agent_feedback").insert({
    workspace_id: input.workspaceId,
    run_id: input.runId || null,
    user_id: input.userId || null,
    rating: input.rating,
    comment: cleanText(input.comment),
    source_ids: sourceIds,
  }).select("*").single();
  if (error || !data) throw error || new Error("에이전트 피드백을 저장하지 못했습니다.");
  if (input.rating !== "good") {
    const instructions: Record<Exclude<typeof input.rating, "good">, string> = {
      needs_improvement: "답변을 더 구체적으로 작성하고 핵심 근거를 빠뜨리지 않는다.",
      incorrect: "답변 전 출처 지식을 다시 확인하고 근거 없는 추론을 하지 않는다.",
      missing_source: "답변에 사용한 지식의 sourceIds와 원본 링크를 반드시 포함한다.",
    };
    await supabaseAdmin.from("cw_agent_improvement_candidates").insert({
      workspace_id: input.workspaceId,
      run_id: input.runId || null,
      feedback_id: data.id,
      instruction: instructions[input.rating],
      reason: cleanText(input.comment) || `사용자 평가: ${input.rating}`,
      source_ids: sourceIds,
      status: "proposed",
      created_by: input.userId || null,
    });
  }
  return data;
}

export async function listImprovementCandidates(workspaceId: string) {
  const { data, error } = await supabaseAdmin.from("cw_agent_improvement_candidates").select("id,instruction,reason,source_ids,status,created_at").eq("workspace_id", workspaceId).eq("status", "approved").order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
}

export async function listAgentQuality(workspaceId: string) {
  const [{ data: runs, error: runsError }, { data: feedback, error: feedbackError }, { data: candidates, error: candidatesError }] = await Promise.all([
    supabaseAdmin.from("cw_agent_runs").select("*").eq("workspace_id", workspaceId).order("started_at", { ascending: false }).limit(100),
    supabaseAdmin.from("cw_agent_feedback").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("cw_agent_improvement_candidates").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (runsError) throw runsError;
  if (feedbackError) throw feedbackError;
  if (candidatesError) throw candidatesError;
  const feedbackRows = feedback || [];
  return {
    runs: runs || [],
    feedback: feedbackRows,
    candidates: candidates || [],
    metrics: {
      runCount: runs?.length || 0,
      completedCount: runs?.filter((run) => run.status === "completed").length || 0,
      failureCount: runs?.filter((run) => run.status === "failed").length || 0,
      feedbackCount: feedbackRows.length,
      positiveRate: feedbackRows.length ? Math.round(feedbackRows.filter((row) => row.rating === "good").length / feedbackRows.length * 100) : 0,
      proposedCount: candidates?.filter((candidate) => candidate.status === "proposed").length || 0,
    },
  };
}

export async function updateImprovementCandidate(input: { workspaceId: string; candidateId: string; status: "approved" | "rejected"; reviewerId: string }) {
  const { data, error } = await supabaseAdmin.from("cw_agent_improvement_candidates").update({ status: input.status, reviewed_by: input.reviewerId, reviewed_at: new Date().toISOString() }).eq("id", input.candidateId).eq("workspace_id", input.workspaceId).select("*").maybeSingle();
  if (error) {
    console.error("[agent-quality] 개선 후보 상태 저장 실패", error.code, error.message);
    throw new Error("개선 후보 상태를 저장하지 못했습니다.");
  }
  if (!data) throw new Error("개선 후보를 찾을 수 없습니다.");
  return data;
}

function hexId(value: string, length: number) {
  const normalized = value.replace(/-/g, "").replace(/[^0-9a-f]/gi, "").padEnd(length, "0");
  return normalized.slice(0, length);
}

export async function exportAgentRunsToPhoenix(input: { workspaceId: string; runIds?: string[] }) {
  const endpoint = process.env.PHOENIX_OTEL_ENDPOINT?.trim() || process.env.PHOENIX_ENDPOINT?.trim();
  const apiKey = process.env.PHOENIX_API_KEY?.trim();
  if (!endpoint) throw new Error("PHOENIX_OTEL_ENDPOINT 또는 PHOENIX_ENDPOINT가 설정되지 않았습니다.");
  if (!apiKey) throw new Error("PHOENIX_API_KEY가 설정되지 않았습니다.");
  let query = supabaseAdmin.from("cw_agent_runs").select("id,agent_name,task_type,input_summary,status,result_summary,error_code,started_at,completed_at,duration_ms").eq("workspace_id", input.workspaceId).order("started_at", { ascending: false }).limit(100);
  if (input.runIds?.length) query = query.in("id", input.runIds.slice(0, 100));
  const { data: runs, error } = await query;
  if (error) throw error;
  const resourceSpans = (runs || []).map((run) => ({
    resource: { attributes: [{ key: "service.name", value: { stringValue: "clipwise" } }, { key: "clipwise.workspace_id", value: { stringValue: input.workspaceId } }] },
    scopeSpans: [{
      scope: { name: "clipwise-agent", version: "1.0.0" },
      spans: [{
        traceId: hexId(run.id, 32), spanId: hexId(run.id.slice(0, 18), 16), name: `agent.${run.task_type}`, kind: 1,
        startTimeUnixNano: String(new Date(run.started_at).getTime() * 1_000_000),
        endTimeUnixNano: String(new Date(run.completed_at || run.started_at).getTime() * 1_000_000),
        status: { code: run.status === "completed" ? 1 : run.status === "failed" ? 2 : 0 },
        attributes: [
          { key: "clipwise.agent_name", value: { stringValue: run.agent_name } },
          { key: "clipwise.status", value: { stringValue: run.status } },
          { key: "clipwise.input_summary", value: { stringValue: run.input_summary || "" } },
          { key: "clipwise.result_summary", value: { stringValue: run.result_summary || "" } },
          { key: "clipwise.error_code", value: { stringValue: run.error_code || "" } },
        ],
      }],
    }],
  }));
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, api_key: apiKey }, body: JSON.stringify({ resourceSpans }) });
  if (!response.ok) throw new Error(`Phoenix export 실패 (${response.status})`);
  return { exported: resourceSpans.reduce((count, resource) => count + resource.scopeSpans[0].spans.length, 0), endpoint };
}
