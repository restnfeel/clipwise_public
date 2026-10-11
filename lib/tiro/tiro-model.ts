type RecordValue = Record<string, unknown>;

export type ClipwiseTiroNote = {
  workspace_id: string;
  source_system: "tiro";
  source_id: string;
  source_workspace_id: string;
  title: string;
  content: string;
  summary: string | null;
  source_updated_at: string | null;
  raw_payload: RecordValue;
};

export function normalizeTiroNote(input: { workspaceId: string; workspaceGuid: string; note: RecordValue; paragraphs: unknown; summaries: unknown }): ClipwiseTiroNote {
  const sourceId = stringValue(input.note.guid) || stringValue(input.note.id);
  if (!sourceId) throw new Error("Tiro note guid가 필요합니다.");
  const paragraphs = records(input.paragraphs);
  const summaries = records(input.summaries);
  return {
    workspace_id: input.workspaceId,
    source_system: "tiro",
    source_id: sourceId,
    source_workspace_id: input.workspaceGuid,
    title: stringValue(input.note.title) || "제목 없는 Tiro 노트",
    content: paragraphs.map(paragraphText).filter(Boolean).join("\n\n"),
    summary: summaries.map(summaryText).filter(Boolean).join("\n\n") || null,
    source_updated_at: stringValue(input.note.updatedAt) || null,
    raw_payload: input.note,
  };
}

function records(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.content)) return value.content.filter(isRecord);
  return [];
}

function paragraphText(value: RecordValue) {
  return nestedText(value.transcript) || stringValue(value.text) || stringValue(value.content) || "";
}

function summaryText(value: RecordValue) {
  return nestedText(value.content) || nestedText(value.summary) || stringValue(value.text) || stringValue(value.summary) || "";
}

function nestedText(value: unknown) {
  if (!isRecord(value)) return "";
  return stringValue(value.content) || stringValue(value.text);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
