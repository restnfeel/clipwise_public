export const KNOWLEDGE_ITEM_SELECT = "*, category:cw_knowledge_categories(id,name,color)";

/** 지식함 SQL(Feature 012) 적용 전에는 새 칸·테이블·관계가 없다. */
export function isHubSchemaMissing(error: { code?: string } | null) {
  return Boolean(error && ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"].includes(error.code || ""));
}

export const AI_CATEGORY_LIMIT = 12;
export const LINK_MIN_SCORE = 0.6;
export const ENRICH_PROMPT_VERSION = "knowledge-enrich-v1";
export const ENRICH_BODY_MAX = 6_000;
export const ENRICH_NEIGHBOR_MAX = 50;
export const ENRICH_BATCH_MAX = 20;
export const ENRICH_TOPICS_MAX = 8;
export const ENRICH_RELATED_MAX = 5;
export const GRAPH_NODE_MAX = 300;
export const GRAPH_TAG_EDGE_MAX = 1_500;
export const USER_TOPICS_MAX = 20;
export const CATEGORY_COLORS = ["amber", "teal", "rose", "indigo", "lime", "sky", "violet", "orange"] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];
export type CategoryOrigin = "user" | "ai";
export type LinkStatus = "suggested" | "accepted" | "rejected";

export type KnowledgeCategory = {
  id: string;
  name: string;
  description: string | null;
  color: CategoryColor;
  origin: CategoryOrigin;
  sort_order: number;
  count?: number;
};

export type KnowledgeLink = {
  id: string;
  from_item_id: string;
  to_item_id: string;
  origin: CategoryOrigin;
  status: LinkStatus;
  reason: string | null;
  confidence: number | null;
};

export type GraphNode = { id: string; title: string; status: string; categoryId: string | null; topics: string[] };
export type GraphEdge = { source: string; target: string; kind: "link" | "tag"; status?: LinkStatus; weight: number; linkId?: string };
export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  tags: { tag: string; count: number }[];
  categories: KnowledgeCategory[];
  uncategorized: number;
  needsEnrich: number;
  truncated: boolean;
};

export type AiSignals = {
  aiStatus?: string;
  personalData?: number;
  priority?: number;
  reviewRecommended?: number;
};

export type EnrichItemInput = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  topics: string[];
  category_id: string | null;
  category_source: CategoryOrigin | null;
  topics_source: CategoryOrigin | null;
};

export type EnrichNeighbor = { id: string; title: string; topics: string[] };

export type EnrichParsed = {
  summary: string;
  topics: string[];
  entities: { name: string; type: string }[];
  decisions: string[];
  actionItems: { task: string; owner: string | null }[];
  newCategory: { name: string; description: string } | null;
  related: { id: string; reason: string }[];
};

export type CategoryDecision =
  | { action: "keep" }
  | { action: "none" }
  | { action: "assign"; categoryId: string; confidence: number | null }
  | { action: "create"; name: string; description: string; confidence: number | null };
