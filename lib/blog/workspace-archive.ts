import { BLOG_POSTS_TABLE } from "@/lib/blog/constants";
import { supabaseAdmin } from "@/lib/supabase";
import { ownerImagesFor, readWorkspaceRows, toWorkspaceInfo, type WorkspaceInfo } from "@/lib/workspace/workspace-settings";

export type ArchiveWorkspace = WorkspaceInfo & { postCount: number; lastPublishedAt: string | null };

export type ArchivePostSummary = {
  id: string;
  title: string;
  slug: string | null;
  slugid: string | null;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
};

export type PublishedPost = ArchivePostSummary & {
  title: string;
  published_at: string;
  content: string;
  created_at: string;
  updated_at: string;
  workspace: { id: string; displayName: string } | null;
  videos: { id: string; video_id: string; video_title: string; video_url: string; thumbnail_url: string }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function publishedStats(workspaceId?: string) {
  let query = supabaseAdmin.from(BLOG_POSTS_TABLE).select("workspace_id,published_at").eq("status", "published").not("workspace_id", "is", null);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query;
  if (error) { console.error("[workspace-archive] 공개 글 집계 실패", error.code); return new Map<string, { count: number; last: string | null }>(); }
  const stats = new Map<string, { count: number; last: string | null }>();
  for (const row of data || []) {
    const id = row.workspace_id as string;
    const current = stats.get(id) || { count: 0, last: null };
    const publishedAt = (row.published_at as string | null) || null;
    stats.set(id, { count: current.count + 1, last: publishedAt && (!current.last || publishedAt > current.last) ? publishedAt : current.last });
  }
  return stats;
}

async function toArchiveWorkspaces(stats: Map<string, { count: number; last: string | null }>) {
  const ids = Array.from(stats.keys());
  if (!ids.length) return [];
  const [rows, images] = await Promise.all([readWorkspaceRows(ids), ownerImagesFor(ids)]);
  return rows.map((row): ArchiveWorkspace => {
    const stat = stats.get(row.id)!;
    return { ...toWorkspaceInfo(row, images.get(row.id) || null), postCount: stat.count, lastPublishedAt: stat.last };
  });
}

/** 공개 글이 1건 이상인 워크스페이스만, 최근 공개 순. */
export async function listArchiveWorkspaces() {
  try {
    const workspaces = await toArchiveWorkspaces(await publishedStats());
    return [...workspaces].sort((a, b) => (b.lastPublishedAt || "").localeCompare(a.lastPublishedAt || ""));
  } catch (error) {
    console.error("[workspace-archive] 목록 실패", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getArchiveWorkspace(id: string) {
  if (!UUID.test(id)) return null;
  try {
    const [workspace] = await toArchiveWorkspaces(await publishedStats(id));
    return workspace || null;
  } catch (error) {
    console.error("[workspace-archive] 조회 실패", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function listWorkspacePosts(workspaceId: string): Promise<ArchivePostSummary[]> {
  const { data, error } = await supabaseAdmin.from(BLOG_POSTS_TABLE)
    .select("id, title, slug, slugid, excerpt, category, published_at")
    .eq("status", "published").eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false, nullsFirst: false }).limit(50);
  if (error) { console.error("[workspace-archive] 글 목록 실패", error.code); return []; }
  return (data || []) as ArchivePostSummary[];
}

export async function getPublishedPost(slugid: string): Promise<PublishedPost | null> {
  const value = decodeURIComponent(slugid);
  if (!value || value.length > 200) return null;
  const { data, error } = await supabaseAdmin.from(BLOG_POSTS_TABLE)
    .select("id,title,slug,slugid,content,excerpt,category,published_at,created_at,updated_at,workspace_id")
    .eq("status", "published").eq("slugid", value).maybeSingle();
  if (error || !data) return null;
  return { ...(data as Omit<PublishedPost, "workspace" | "videos">), published_at: String(data.published_at || data.created_at), workspace: await archiveWorkspaceLabel(data.workspace_id as string | null), videos: [] };
}

/** 글 상세의 워크스페이스 링크용. 이름 외 정보는 내보내지 않는다. */
export async function archiveWorkspaceLabel(workspaceId: string | null | undefined) {
  if (!workspaceId || !UUID.test(workspaceId)) return null;
  try {
    const [row] = await readWorkspaceRows([workspaceId]);
    return row ? { id: row.id, displayName: toWorkspaceInfo(row, null).displayName } : null;
  } catch { return null; }
}
