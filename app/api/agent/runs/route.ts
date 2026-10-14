import { NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { listAgentQuality, recordAgentFeedback } from "@/lib/agent/observability";

const SCHEMA_CODES = new Set(["42P01", "PGRST205"]);

function isMissingAgentSchema(error: unknown) {
  return typeof error === "object" && error !== null && SCHEMA_CODES.has(String((error as { code?: string }).code || ""));
}

export async function GET() {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const [workspaceId] = await workspaceIdsForUser(auth.userId);
  if (!workspaceId) return NextResponse.json({ runs: [], feedback: [], candidates: [], metrics: { runCount: 0, completedCount: 0, failureCount: 0, feedbackCount: 0, positiveRate: 0, proposedCount: 0 } });
  try {
    const quality = await listAgentQuality(workspaceId);
    return NextResponse.json(quality);
  } catch (error) {
    if (isMissingAgentSchema(error)) return NextResponse.json({ runs: [], feedback: [], candidates: [], metrics: { runCount: 0, completedCount: 0, failureCount: 0, feedbackCount: 0, positiveRate: 0, proposedCount: 0 }, schemaPending: true });
    console.error("[agent-runs] 조회 실패", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "에이전트 활동을 읽지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const body = await request.json().catch(() => null) as { runId?: unknown; rating?: unknown } | null;
  const rating = body?.rating;
  if (rating !== "good" && rating !== "needs_improvement") return NextResponse.json({ error: "유효한 평가가 필요합니다." }, { status: 400 });
  const [workspaceId] = await workspaceIdsForUser(auth.userId);
  if (!workspaceId) return NextResponse.json({ error: "개인 workspace가 설정되지 않았습니다." }, { status: 503 });
  try {
    const feedback = await recordAgentFeedback({ workspaceId, userId: auth.userId, runId: typeof body?.runId === "string" ? body.runId : null, rating });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    if (isMissingAgentSchema(error)) return NextResponse.json({ error: "에이전트 활동 DB 스키마가 아직 준비되지 않았습니다.", code: "SCHEMA_PENDING" }, { status: 503 });
    console.error("[agent-runs] 평가 저장 실패", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "평가를 저장하지 못했습니다." }, { status: 500 });
  }
}
