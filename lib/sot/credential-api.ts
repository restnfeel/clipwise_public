import { NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceIdsForUser } from "@/lib/connector/workspace-scope";
import { SourceCredentialError } from "@/lib/sot/credentials";
import { isUserScopedProvider } from "@/lib/sot/providers";

export async function requireCredentialUser() {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) throw new SourceCredentialError("로그인이 필요합니다.", "UNAUTHORIZED", 401);
  const workspaceId = (await workspaceIdsForUser(auth.userId))[0];
  if (!workspaceId) throw new SourceCredentialError("개인 workspace를 준비하지 못했습니다.", "WORKSPACE_NOT_CONFIGURED", 503);
  return { actor: { userId: auth.userId, email: null as string | null }, workspaceId };
}
export async function assertUserScopedCredentialProvider(provider: string) {
  if (!isUserScopedProvider(provider)) throw new SourceCredentialError("지원하지 않는 원본 서비스입니다.", "NOT_FOUND", 404);
}
export function credentialErrorResponse(error: unknown) {
  if (error instanceof SourceCredentialError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("[SOT credentials] 처리 실패", error instanceof Error ? error.message : "unknown");
  return NextResponse.json({ error: "키 설정을 처리하지 못했습니다.", code: "CREDENTIAL_ERROR" }, { status: 503 });
}
