import { createHash } from "node:crypto";
import { z } from "zod";

export const DOCUMENT_ANALYSIS_SOURCE = "claude_document";
export const DOCUMENT_ANALYSIS_BODY_MAX = 50_000;

// MCP 도구 입력. 파일 원문은 받지 않고 Claude가 분석한 결과 텍스트만 받는다.
export const documentAnalysisInputSchema = {
  approved: z.boolean().describe("사용자가 저장을 승인했으면 true"),
  title: z.string().trim().min(1).max(200).describe("지식 제목"),
  summary: z.string().trim().min(1).max(1000).describe("핵심 요약(1,000자 이내)"),
  body: z.string().trim().min(1).max(DOCUMENT_ANALYSIS_BODY_MAX).describe("마크다운 분석 본문. 파일 원문·이미지·base64 금지"),
  topics: z.array(z.string().trim().min(1).max(60)).max(10).optional().describe("주제 태그"),
  decisions: z.array(z.string().trim().min(1).max(500)).max(20).optional().describe("문서에 담긴 결정 사항"),
  actionItems: z.array(z.object({ task: z.string().trim().min(1).max(500), owner: z.string().trim().max(100).optional() })).max(20).optional().describe("할 일"),
  document: z.object({
    fileName: z.string().trim().min(1).max(255).describe("원본 파일명"),
    fileType: z.string().trim().max(40).optional().describe("pdf, docx, hwp 등"),
    pageCount: z.number().int().positive().max(100_000).optional(),
    author: z.string().trim().max(200).optional(),
    documentDate: z.string().trim().max(40).optional().describe("문서 작성일"),
  }).describe("원본 문서 정보(내용 제외)"),
};

export type DocumentAnalysisInput = Omit<z.infer<z.ZodObject<typeof documentAnalysisInputSchema>>, "approved">;

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function documentSourceId(fileName: string, title: string): string {
  const hash = createHash("sha256").update(`${normalizeKey(fileName)}\n${normalizeKey(title)}`).digest("hex");
  return `doc:${hash.slice(0, 32)}`;
}

export function buildDocumentAnalysisRow(input: DocumentAnalysisInput, context: { clientName: string; now: string }) {
  const document = Object.fromEntries(Object.entries(input.document).filter(([, value]) => value !== undefined));
  return {
    source_system: DOCUMENT_ANALYSIS_SOURCE,
    source_id: documentSourceId(input.document.fileName, input.title),
    type: "document" as const,
    title: input.title,
    summary: input.summary,
    body: input.body,
    topics: input.topics ?? [],
    decisions: input.decisions ?? [],
    action_items: (input.actionItems ?? []).map((item) => ({ task: item.task, owner: item.owner ?? null })),
    status: "draft" as const,
    visibility: "private" as const,
    metadata: { source: "mcp", client: context.clientName, analyzedAt: context.now, document },
  };
}
