type ChatResult = { content: string; model: string; ms: number; label: string };
const env = (name: string) => process.env[name]?.trim() || "";
export function isAiEnabled() { return Boolean(env("OPENROUTER_API_KEY") || env("OPENAI_API_KEY")); }
export function pickNewsletterAgent() { return isAiEnabled() ? "openrouter" : null; }
export function parseAgentJson(value: unknown, label: string) { const text = typeof value === "string" ? value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") : ""; const start = text.indexOf("{"); const end = text.lastIndexOf("}"); if (start < 0 || end <= start) throw new Error(`${label} 후보가 올바른 JSON이 아닙니다.`); try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { throw new Error(`${label} 후보가 올바른 JSON이 아닙니다.`); } }
export async function chatCompletion(_agent: string, options: { system: string; user: string; temperature?: number; maxTokens?: number }): Promise<ChatResult> {
  const key = env("OPENROUTER_API_KEY") || env("OPENAI_API_KEY"); if (!key) throw new Error("AI 키가 설정되지 않았습니다.");
  const base = env("OPENROUTER_API_KEY") ? "https://openrouter.ai/api/v1" : env("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const model = env("OPENROUTER_API_KEY") ? env("OPENROUTER_MODEL") || "openai/gpt-4o-mini" : env("OPENAI_MODEL") || "gpt-4o-mini"; const started = Date.now();
  const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: options.temperature ?? 0, max_tokens: options.maxTokens ?? 4000, messages: [{ role: "system", content: options.system }, { role: "user", content: options.user }] }), cache: "no-store" });
  if (!response.ok) throw new Error("AI 요청에 실패했습니다."); const body = await response.json() as { choices?: [{ message?: { content?: string } }] }; return { content: body.choices?.[0]?.message?.content || "", model, ms: Date.now() - started, label: env("OPENROUTER_API_KEY") ? "OpenRouter" : "OpenAI" };
}
