"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function McpAuthForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/mcp/key/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, callbackUrl }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "MCP 인증키를 확인하지 못했습니다.");
      window.location.assign(body.redirectTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "MCP 인증에 실패했습니다."); setLoading(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ec] px-5 text-[#302a25]"><section className="w-full max-w-md rounded-2xl border border-[#ded6ca] bg-[#fffdf9] p-8 shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9a6b32]">Clipwise · MCP</p><h1 className="mt-4 font-serif text-3xl">MCP 연결 인증</h1><p className="mt-4 text-sm leading-7 text-[#62584f]">관리자에게 발급받은 Clipwise MCP 인증키를 입력하면 Claude 연결을 계속할 수 있습니다.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">인증키<input value={key} onChange={(event) => setKey(event.target.value)} required autoFocus type="password" placeholder="cw_mcp_..." className="mt-2 w-full rounded-lg border border-[#cfc4b5] bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#9a6b32]" /></label>{error && <p className="text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-[#9a6b32] px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "확인 중..." : "MCP 연결 계속하기"}</button></form><p className="mt-5 text-xs leading-6 text-[#817568]">인증키는 Clipwise 관리자에게 발급받아야 합니다.</p></section></main>;
}

export default function McpAuthPage() { return <Suspense fallback={<main className="min-h-screen bg-[#f7f3ec]" />}><McpAuthForm /></Suspense>; }
