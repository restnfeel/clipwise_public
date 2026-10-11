export const WORKSPACE_NAME_MAX = 30;

export type CoverImageType = "image/jpeg" | "image/png" | "image/webp";

/** 지식 아카이브 등 공개 화면에 쓰는 "{이름} Workspace" 표기. */
export function workspaceDisplayName(name: string | null | undefined) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "Clipwise Workspace";
  return /workspace$/i.test(trimmed) ? trimmed : `${trimmed} Workspace`;
}

export function workspaceInitial(name: string | null | undefined) {
  const first = Array.from((name || "").trim())[0];
  return first ? first.toUpperCase() : "C";
}

/** 공백을 정리한 1~30자 이름. 규칙에 맞지 않으면 null. */
export function validateWorkspaceName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  const length = Array.from(normalized).length;
  return length >= 1 && length <= WORKSPACE_NAME_MAX ? normalized : null;
}

/** 파일 앞부분 바이트로 JPG·PNG·WebP만 판별한다. 확장자·MIME 위장을 막기 위함. */
export function detectImageType(bytes: Uint8Array): CoverImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === "RIFF" &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === "WEBP"
  ) return "image/webp";
  return null;
}
