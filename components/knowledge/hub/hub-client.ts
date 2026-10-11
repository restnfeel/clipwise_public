import type { AiSignals, GraphResponse, KnowledgeCategory, LinkStatus } from "@/lib/knowledge/hub/types";

export type { GraphResponse, KnowledgeCategory };

export type KnowledgeItem = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  topics: string[];
  decisions: string[];
  action_items: { task: string; owner?: string | null }[];
  status: string;
  source_system: string;
  updated_at: string;
  category_id?: string | null;
  category?: { id: string; name: string; color: string } | null;
  category_source?: "ai" | "user" | null;
  category_confidence?: number | null;
  topics_source?: "ai" | "user" | null;
  ai_signals?: AiSignals | null;
  ai_enriched_at?: string | null;
  type?: string | null;
  archive?: { slugid: string; status: string } | null;
};

export type ItemLink = {
  id: string;
  from_item_id: string;
  to_item_id: string;
  origin: "ai" | "user";
  status: LinkStatus;
  reason: string | null;
  confidence: number | null;
  other: { id: string; title: string; status: string; category: { name: string; color: string } | null };
};

export type HubView = "list" | "graph" | "cloud";

export const STATUS_LABELS: Record<string, string> = { draft: "초안", reviewed: "검토됨", published: "공유됨", processing: "처리 중", failed: "확인 필요" };

export type WorkspaceInfo = {
  id: string;
  name: string;
  displayName: string;
  coverUrl: string | null;
  fallbackImage: string | null;
};

export type WorkspaceSettings = { workspace: WorkspaceInfo; role: string | null; canEdit: boolean; canReview: boolean };

/** JSON API 호출(FormData는 그대로 전송). 실패하면 서버가 준 한국어 메시지로 Error를 던진다. */
export async function hubFetch<T>(url: string, init?: { method?: string; body?: unknown }, fallback = "요청을 처리하지 못했습니다."): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const response = await fetch(url, {
    method: init?.method || "GET",
    cache: "no-store",
    headers: init?.body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : fallback);
  return body as T;
}

export const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
