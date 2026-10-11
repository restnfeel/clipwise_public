import { NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser, workspaceRoleForUser } from "@/lib/connector/workspace-scope";
import { isHubSchemaMissing } from "@/lib/knowledge/hub/types";

export const REVIEWER_ROLES = ["owner", "admin", "editor"];

export class KnowledgeHubError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export const hubNotFound = (message = "지식을 찾을 수 없습니다.") => new KnowledgeHubError("NOT_FOUND", message, 404);

/** Supabase 오류를 허브 오류로 바꾼다. 새 칸·테이블이 없으면 SQL 적용 안내를 돌려준다. */
export function hubDbError(error: { code?: string; message?: string } | null, label: string): KnowledgeHubError {
  if (isHubSchemaMissing(error)) {
    return new KnowledgeHubError("SCHEMA_MISSING", "지식함 DB 업데이트가 필요합니다. 관리자에게 sqls/create_cw_knowledge_hub.sql 적용을 요청하세요.", 503);
  }
  console.error(`[knowledge-hub] ${label}`, error?.code || "unknown");
  return new KnowledgeHubError("DB_ERROR", `${label}에 실패했습니다.`, 500);
}

type HubContext = { userId: string; workspaceId: string };

/** 인증 → 첫 workspace → (reviewer면) 검수 역할 확인 → 처리. */
export async function withKnowledgeWorkspace(handler: (context: HubContext) => Promise<NextResponse>, options: { reviewer?: boolean } = {}) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  try {
    const [workspaceId] = await workspaceIdsForUser(auth.userId);
    if (!workspaceId) throw new KnowledgeHubError("WORKSPACE_REQUIRED", "Clipwise workspace가 설정되지 않았습니다.", 503);
    if (options.reviewer && !REVIEWER_ROLES.includes(await workspaceRoleForUser(auth.userId, workspaceId) || "")) {
      throw new KnowledgeHubError("FORBIDDEN", "workspace 검수 권한이 필요합니다.", 403);
    }
    return await handler({ userId: auth.userId, workspaceId });
  } catch (error) {
    if (error instanceof KnowledgeHubError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[knowledge-hub] 요청 처리 실패", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

export const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
