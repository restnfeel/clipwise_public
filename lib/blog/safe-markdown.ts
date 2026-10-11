/** 공개 아카이브 본문용 마크다운 → HTML. HTML을 먼저 이스케이프하므로 dangerouslySetInnerHTML에 넣어도 된다. */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const SAFE_URL = /^https?:\/\/[^\s"'<>]+$/i;

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function unescapeUrl(url: string) {
  return url.replace(/&amp;/g, "&");
}

function renderInline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) => {
      const raw = unescapeUrl(url);
      return SAFE_URL.test(raw) ? `<a href="${escapeHtml(raw)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    });
}

function renderBlock(block: string) {
  const lines = block.split("\n");
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return `<ul>${lines.map((line) => `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`;
  }
  const heading = /^(#{1,3})\s+(.*)$/.exec(block);
  if (heading && lines.length === 1) return `<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`;
  return `<p>${lines.map((line) => {
    const lineHeading = /^(#{1,3})\s+(.*)$/.exec(line);
    return lineHeading ? `<h${lineHeading[1].length}>${renderInline(lineHeading[2])}</h${lineHeading[1].length}>` : renderInline(line);
  }).join("<br>")}</p>`;
}

export function renderSafeMarkdown(content: string): string {
  const escaped = escapeHtml(content.replace(/\r\n/g, "\n").replace(/\u0000/g, ""));
  const codeBlocks: string[] = [];
  const withoutCode = escaped.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_match, code: string) => {
    codeBlocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });
  return withoutCode
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const code = /^\u0000CODE(\d+)\u0000$/.exec(block);
      return code ? codeBlocks[Number(code[1])] : renderBlock(block);
    })
    .join("\n");
}
