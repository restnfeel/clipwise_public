const TIRO_BASE_URL = "https://api.tiro.ooo";

export class TiroApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | number | undefined,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TiroApiError";
  }

  get retryable() {
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

type FetchLike = typeof fetch;

export class TiroApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: { apiKey: string; baseUrl?: string; fetchImpl?: FetchLike }) {
    if (!options.apiKey.trim()) throw new Error("Tiro API 자격증명이 필요합니다.");
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || TIRO_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async listNotes(workspaceGuid: string) {
    const notes: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ limit: "200" });
      if (cursor) query.set("cursor", cursor);
      const body = await this.request<{ content?: unknown[]; nextCursor?: string }>(
        `/v1/external/workspaces/${encodeURIComponent(workspaceGuid)}/notes?${query.toString()}`,
      );
      notes.push(...(body.content || []).filter(isRecord));
      cursor = body.nextCursor || undefined;
    } while (cursor);
    return notes;
  }

  listParagraphs(noteGuid: string) {
    return this.request<unknown[]>(`/v1/external/notes/${encodeURIComponent(noteGuid)}/paragraphs`);
  }

  listSummaries(noteGuid: string) {
    return this.request<{ content?: unknown[] }>(`/v1/external/notes/${encodeURIComponent(noteGuid)}/summaries`);
  }

  getSummary(noteGuid: string, summaryId: string) {
    return this.request<Record<string, unknown>>(
      `/v1/external/notes/${encodeURIComponent(noteGuid)}/summaries/${encodeURIComponent(summaryId)}`,
    );
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${this.apiKey}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = isRecord(body.error) ? body.error : {};
      throw new TiroApiError(
        typeof error.message === "string" ? error.message : `Tiro API 오류 (${response.status})`,
        response.status,
        typeof error.code === "string" || typeof error.code === "number" ? error.code : undefined,
        parseRetryAfter(response.headers.get("retry-after")),
      );
    }
    return body as T;
  }
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
