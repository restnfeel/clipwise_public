import { TiroApiClient, TiroApiError } from "@/lib/tiro/tiro-client";
type TestResult = { ok: true; account?: Record<string, unknown> } | { ok: false; code: string; message: string };
export async function testSourceCredentials(provider: string, _workspaceId: string, values: Record<string, string>): Promise<TestResult> {
  if (provider !== "tiro") return { ok: false, code: "NOT_FOUND", message: "지원하지 않는 원본 서비스입니다." };
  try { const notes = await new TiroApiClient({ apiKey: values.apiKey }).listNotes(values.workspaceGuid); return { ok: true, account: { noteCount: notes.length } }; }
  catch (error) { return { ok: false, code: error instanceof TiroApiError ? "TIRO_API_ERROR" : "TIRO_CONNECTION_ERROR", message: "Tiro 연결을 확인하지 못했습니다." }; }
}
