import { supabaseAdmin } from "@/lib/supabase";
import { listCategories } from "@/lib/knowledge/hub/categories-server";
import { buildTagEdges, countTags } from "@/lib/knowledge/hub/graph-core";
import { hubDbError } from "@/lib/knowledge/hub/hub-http";
import { GRAPH_NODE_MAX, GRAPH_TAG_EDGE_MAX, type GraphEdge, type GraphNode, type GraphResponse, type LinkStatus } from "@/lib/knowledge/hub/types";

const LINK_FETCH_MAX = 5000;

export async function buildKnowledgeGraph(workspaceId: string, filter: { status?: string; categoryId?: string | "none"; tag?: string } = {}): Promise<GraphResponse> {
  let itemQuery = supabaseAdmin.from("cw_knowledge_items").select("id,title,status,category_id,category_source,topics").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }).limit(GRAPH_NODE_MAX + 1);
  if (filter.status) itemQuery = itemQuery.eq("status", filter.status);
  if (filter.categoryId === "none") itemQuery = itemQuery.is("category_id", null);
  else if (filter.categoryId) itemQuery = itemQuery.eq("category_id", filter.categoryId);
  if (filter.tag?.trim()) itemQuery = itemQuery.contains("topics", [filter.tag.trim()]);

  const [items, links, categoryList] = await Promise.all([
    itemQuery,
    supabaseAdmin.from("cw_knowledge_links").select("id,from_item_id,to_item_id,status").eq("workspace_id", workspaceId).neq("status", "rejected").limit(LINK_FETCH_MAX),
    listCategories(workspaceId),
  ]);
  if (items.error) throw hubDbError(items.error, "그래프 지식 조회");
  if (links.error) throw hubDbError(links.error, "그래프 연결 조회");

  const rows = items.data || [];
  const nodes: GraphNode[] = rows.slice(0, GRAPH_NODE_MAX).map((row) => ({ id: row.id, title: row.title, status: row.status, categoryId: row.category_id, topics: row.topics || [] }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const linkEdges: GraphEdge[] = (links.data || [])
    .filter((link) => nodeIds.has(link.from_item_id) && nodeIds.has(link.to_item_id))
    .map((link) => ({ source: link.from_item_id, target: link.to_item_id, kind: "link", status: link.status as LinkStatus, weight: 1, linkId: link.id }));
  const needsEnrich = rows.slice(0, GRAPH_NODE_MAX).filter((row) => (!row.category_id && !row.category_source) || !(row.topics || []).length).length;

  return {
    nodes,
    edges: [...linkEdges, ...buildTagEdges(nodes, GRAPH_TAG_EDGE_MAX)],
    tags: countTags(nodes),
    categories: categoryList.categories,
    uncategorized: categoryList.uncategorized,
    needsEnrich,
    truncated: rows.length > GRAPH_NODE_MAX,
  };
}
