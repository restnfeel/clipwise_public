import { supabaseAdmin } from "@/lib/supabase";
import { workspaceIdsForUser, workspaceRoleForUser } from "@/lib/connector/workspace-scope";
import { REVIEWER_ROLES } from "@/lib/workspace/roles";
import { validateWorkspaceName, workspaceDisplayName } from "@/lib/workspace/workspace-display";

export const WORKSPACE_EDIT_ROLES = ["owner", "admin"];

export class WorkspaceSettingsError extends Error {
  constructor(public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_NAME" | "INVALID_COVER" | "DB_ERROR", message: string, public status: number) {
    super(message);
  }
}

export type WorkspaceInfo = {
  id: string;
  name: string;
  displayName: string;
  coverUrl: null;
  fallbackImage: string | null;
};

type WorkspaceRow = { id: string; name: string | null };

export async function readWorkspaceRows(ids: string[]): Promise<WorkspaceRow[]> {
  if (!ids.length) return [];
  const result = await supabaseAdmin.from("cw_workspaces").select("id,name").in("id", ids);
  if (result.error) throw new WorkspaceSettingsError("DB_ERROR", "워크스페이스를 읽지 못했습니다.", 500);
  return (result.data || []) as WorkspaceRow[];
}

/** 워크스페이스별 첫 owner의 로그인 이미지. 공개 화면에 쓰므로 이미지 URL만 돌려준다. */
export async function ownerImagesFor(workspaceIds: string[]) {
  const images = new Map<string, string>();
  if (!workspaceIds.length) return images;
  const { data: owners, error } = await supabaseAdmin.from("cw_workspace_memberships")
    .select("workspace_id,user_id,created_at").in("workspace_id", workspaceIds).eq("role", "owner").order("created_at", { ascending: true });
  if (error) { console.error("[workspace] owner 조회 실패", error.code); return images; }
  const userIds = Array.from(new Set((owners || []).map((row) => row.user_id as string)));
  if (!userIds.length) return images;
  const { data: users, error: userError } = await supabaseAdmin.from("users").select("id,profile_image").in("id", userIds);
  if (userError) { console.error("[workspace] owner 이미지 조회 실패", userError.code); return images; }
  const imageByUser = new Map((users || []).map((user) => [user.id as string, safeImage(user.profile_image)]));
  for (const owner of owners || []) {
    const image = imageByUser.get(owner.user_id as string);
    if (image && !images.has(owner.workspace_id as string)) images.set(owner.workspace_id as string, image);
  }
  return images;
}

/** 혼합 콘텐츠를 피하려고 http(카카오 등) 이미지는 https로 올려 쓴다. */
function safeImage(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice(7)}`;
  return null;
}

export function toWorkspaceInfo(row: WorkspaceRow, fallbackImage: string | null): WorkspaceInfo {
  return {
    id: row.id,
    name: (row.name || "").trim(),
    displayName: workspaceDisplayName(row.name),
    coverUrl: null,
    fallbackImage,
  };
}

export async function canReviewWorkspace(userId: string, workspaceId: string) {
  const role = await workspaceRoleForUser(userId, workspaceId);
  return role !== null && (REVIEWER_ROLES as readonly string[]).includes(role);
}

export async function getWorkspaceForUser(userId: string) {
  const [workspaceId] = await workspaceIdsForUser(userId);
  if (!workspaceId) return null;
  const [rows, role, images] = await Promise.all([readWorkspaceRows([workspaceId]), workspaceRoleForUser(userId, workspaceId), ownerImagesFor([workspaceId])]);
  const row = rows[0];
  if (!row) return null;
  const canReview = role !== null && (REVIEWER_ROLES as readonly string[]).includes(role);
  return {
    workspace: toWorkspaceInfo(row, images.get(workspaceId) || null),
    role,
    canEdit: role !== null && WORKSPACE_EDIT_ROLES.includes(role),
    canReview,
  };
}

export async function updateWorkspaceSettings(userId: string, input: { name?: unknown }) {
  const current = await getWorkspaceForUser(userId);
  if (!current) throw new WorkspaceSettingsError("NOT_FOUND", "워크스페이스를 찾을 수 없습니다.", 404);
  if (!current.canEdit) throw new WorkspaceSettingsError("FORBIDDEN", "워크스페이스 설정은 owner·admin만 바꿀 수 있습니다.", 403);
  const values: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const name = validateWorkspaceName(input.name);
    if (!name) throw new WorkspaceSettingsError("INVALID_NAME", "워크스페이스 이름은 1~30자로 입력해 주세요.", 400);
    values.name = name;
  }
  if (!Object.keys(values).length) return current;
  const { error } = await supabaseAdmin.from("cw_workspaces").update({ ...values, updated_at: new Date().toISOString() }).eq("id", current.workspace.id);
  if (error) {
    console.error("[workspace] 설정 저장 실패", error.code);
    throw new WorkspaceSettingsError("DB_ERROR", "워크스페이스 설정을 저장하지 못했습니다.", 500);
  }
  const updated = await getWorkspaceForUser(userId);
  if (!updated) throw new WorkspaceSettingsError("NOT_FOUND", "워크스페이스를 찾을 수 없습니다.", 404);
  return updated;
}
