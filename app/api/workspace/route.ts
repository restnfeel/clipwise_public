import { NextRequest, NextResponse } from "next/server";
import { isApiAuthError, requireApiUserId } from "@/lib/auth/api-session";
import { workspaceFailure } from "@/lib/workspace/workspace-http";
import { getWorkspaceForUser, updateWorkspaceSettings } from "@/lib/workspace/workspace-settings";

export async function GET() {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  try {
    const current = await getWorkspaceForUser(auth.userId);
    if (!current) return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(current);
  } catch (error) { return workspaceFailure(error, "조회 실패"); }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUserId();
  if (isApiAuthError(auth)) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  try {
    const updated = await updateWorkspaceSettings(auth.userId, {
      name: body.name,
      
    });
    return NextResponse.json(updated);
  } catch (error) { return workspaceFailure(error, "저장 실패"); }
}
