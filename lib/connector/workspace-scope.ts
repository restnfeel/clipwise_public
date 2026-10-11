import { supabaseAdmin } from "@/lib/supabase";

export async function workspaceIdsForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("cw_workspace_memberships").select("workspace_id").eq("user_id", userId);
  if (error) return [];
  const ids = (data || []).map((row) => row.workspace_id).filter((value): value is string => Boolean(value));
  if (ids.length) return ids;
  try { return [await ensurePersonalWorkspace(userId)]; } catch { return []; }
}

export async function workspaceRoleForUser(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin.from("cw_workspace_memberships").select("role").eq("user_id", userId).eq("workspace_id", workspaceId).maybeSingle();
  return typeof data?.role === "string" ? data.role : null;
}

export async function ensurePersonalWorkspace(userId: string) {
  const { data: user } = await supabaseAdmin.from("users").select("name,email").eq("id", userId).maybeSingle();
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  const slug = `personal-${userId}`;
  const { data: existing } = await supabaseAdmin.from("cw_workspaces").select("id").eq("slug", slug).maybeSingle();
  const workspaceId = existing?.id || (await supabaseAdmin.from("cw_workspaces").insert({ slug, name: String(user.name || user.email?.split("@")[0] || "내").slice(0, 30), kind: "team", created_by: userId }).select("id").single()).data?.id;
  if (!workspaceId) throw new Error("개인 workspace를 만들 수 없습니다.");
  const { error } = await supabaseAdmin.from("cw_workspace_memberships").upsert({ workspace_id: workspaceId, user_id: userId, role: "owner" }, { onConflict: "workspace_id,user_id" });
  if (error) throw new Error("workspace 멤버십을 저장할 수 없습니다.");
  return workspaceId;
}
