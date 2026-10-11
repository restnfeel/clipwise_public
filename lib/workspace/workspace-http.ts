import { NextResponse } from "next/server";
import { WorkspaceSettingsError } from "@/lib/workspace/workspace-settings";

export function workspaceFailure(error: unknown, label: string) {
  if (error instanceof WorkspaceSettingsError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(`[workspace] ${label}`, error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "워크스페이스 처리에 실패했습니다." }, { status: 500 });
}
