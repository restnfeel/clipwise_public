export type SourceProvider = "tiro";

export type SourceConnection = {
  id: string;
  workspaceId: string;
  userId: string | null;
  provider: SourceProvider;
  displayName: string;
  status: "active" | "paused" | "revoked" | "error";
  scopes: string[];
  lastSyncedAt: string | null;
  cursor: string | null;
  metadata: Record<string, unknown>;
  /** 서버에서 동기화 직전에만 채우는 복호화된 키. 응답·로그·직렬화 금지. */
  credentials?: Record<string, string>;
  /** 서버 동기화 단계에서만 사용하는 암호화 토큰. 응답·로그·직렬화 금지. */
  credentialsEncrypted?: string | null;
};

export type SourceDocument = {
  id: string;
  workspaceId: string;
  sourceSystem: SourceProvider;
  sourceConnectionId: string | null;
  sourceId: string;
  sourceWorkspaceId: string | null;
  sourceUrl: string | null;
  title: string;
  body: string;
  mimeType: string;
  capturedAt: string | null;
  sourceUpdatedAt: string | null;
  sourceRevision: string | null;
  checksum: string;
  language: string | null;
  status: "active" | "deleted" | "unavailable";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SourceDocumentInput = Omit<SourceDocument, "id" | "checksum" | "createdAt" | "updatedAt"> & {
  rawPayload?: Record<string, unknown>;
};

export type SourceLocator = { sourceId: string; title?: string; sourceUpdatedAt?: string | null; sourceUrl?: string | null };

export interface SourceAdapter {
  readonly provider: SourceProvider;
  validateConnection(input: { connection: SourceConnection }): Promise<{ ok: true; account?: Record<string, unknown> } | { ok: false; code: string; message: string }>;
  list(input: { connection: SourceConnection; cursor?: string | null; updatedAfter?: string | null }): Promise<{ items: SourceLocator[]; nextCursor: string | null }>;
  /** 상세 원문을 읽어 공통 SourceDocumentInput으로 정규화해 반환한다. */
  fetch(input: { connection: SourceConnection; locator: SourceLocator }): Promise<SourceDocumentInput>;
}

export class SourceAdapterError extends Error {
  /** detail은 공급자가 돌려준 오류 코드(예: Notion object_not_found). */
  constructor(message: string, readonly code = "SOURCE_API_ERROR", readonly detail: string | null = null) { super(message); this.name = "SourceAdapterError"; }
}
