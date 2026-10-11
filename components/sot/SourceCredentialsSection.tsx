"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, PlugZap, Save, Trash2 } from "lucide-react";
import { notice } from "@/lib/notice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SourceCredentialStatus } from "@/lib/sot/credentials";

const SOURCE_BADGE: Record<SourceCredentialStatus["source"], { label: string; className: string }> = {
  db: { label: "등록됨 · 암호화 저장", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  env: { label: "임시 · 서버 .env 사용 중", className: "border-amber-300 bg-amber-50 text-amber-800" },
  none: { label: "미등록", className: "border-[var(--cw-border)] text-[var(--cw-muted)]" },
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
  return body as T;
}

export function SourceCredentialsSection({ providerId }: { providerId?: string } = {}) {
  const [providers, setProviders] = useState<SourceCredentialStatus[] | null>(null);
  const load = useCallback(async () => {
    try {
      const providers = (await requestJson<{ providers: SourceCredentialStatus[] }>("/api/sot/credentials")).providers;
      setProviders(providerId ? providers.filter((provider) => provider.provider === providerId) : providers);
    }
    catch (error) { notice.error(error instanceof Error ? error.message : "키 등록 상태를 불러오지 못했습니다."); setProviders([]); }
  }, [providerId]);
  useEffect(() => { void load(); }, [load]);

  const replace = (next: SourceCredentialStatus) => setProviders((current) => (current || []).map((item) => item.provider === next.provider ? next : item));

  if (!providers) return <p className="flex items-center gap-2 text-sm text-[var(--cw-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> 키 등록 상태를 불러오는 중…</p>;
  if (!providers.length) return <p className="text-sm text-[var(--cw-muted)]">키를 등록할 원본 서비스가 없습니다.</p>;
  return <div className="space-y-6">{providers.map((status) => <ProviderCredentialCard key={status.provider} status={status} onChange={replace} />)}</div>;
}

function ProviderCredentialCard({ status, onChange }: { status: SourceCredentialStatus; onChange: (next: SourceCredentialStatus) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...status.publicValues }));
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const badge = SOURCE_BADGE[status.source];
  const endpoint = `/api/sot/credentials/${encodeURIComponent(status.provider)}`;

  const payload = () => Object.fromEntries(status.fields.map((field) => [field.key, (values[field.key] || "").trim()]).filter(([, value], index) => value || !status.fields[index].secret));
  const resetSecrets = (next: SourceCredentialStatus) => setValues({ ...next.publicValues });

  const save = async () => {
    setBusy("save");
    try {
      const { provider } = await requestJson<{ provider: SourceCredentialStatus }>(endpoint, { method: "PUT", body: JSON.stringify({ values: payload() }) });
      onChange(provider);
      resetSecrets(provider);
      notice.success(`${status.label} 키를 암호화해 저장했습니다.`);
    } catch (error) { notice.error(error instanceof Error ? error.message : "키를 저장하지 못했습니다."); }
    finally { setBusy(null); }
  };

  const test = async () => {
    setBusy("test");
    try {
      const { result } = await requestJson<{ result: { ok: boolean; message?: string; account?: Record<string, unknown> } }>(`${endpoint}/test`, { method: "POST", body: JSON.stringify({ values: payload() }) });
      if (result.ok) notice.success(`${status.label} 연결 확인 완료${typeof result.account?.noteCount === "number" ? ` · 노트 ${result.account.noteCount.toLocaleString("ko-KR")}건` : typeof result.account?.name === "string" ? ` · ${result.account.name}` : ""}`);
      else notice.error(result.message || `${status.label} 연결에 실패했습니다.`);
    } catch (error) { notice.error(error instanceof Error ? error.message : "연결 테스트에 실패했습니다."); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy("delete");
    try {
      const { provider } = await requestJson<{ provider: SourceCredentialStatus }>(endpoint, { method: "DELETE" });
      onChange(provider);
      resetSecrets(provider);
      notice.success(`${status.label} 키를 삭제했습니다.`);
    } catch (error) { notice.error(error instanceof Error ? error.message : "키를 삭제하지 못했습니다."); }
    finally { setBusy(null); }
  };

  const meta = [
    status.updatedAt ? new Date(status.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }) : null,
    status.updatedBy ? `등록자 ${status.updatedBy}` : null,
    Object.keys(status.fingerprints).length ? `키 지문 ${Object.values(status.fingerprints).join(" · ")}` : null,
  ].filter(Boolean).join(" · ");

  return <article className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--cw-accent)]"><KeyRound className="h-4 w-4" /> SOT · {status.label}</p>
        <h2 className="mt-3 font-serif text-2xl">{status.label} 키</h2>
        {meta ? <p className="mt-2 text-xs text-[var(--cw-muted)]">{meta}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 self-start">
        <span className={`border px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        {status.authMethod === "oauth" ? <span className="border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">OAuth 연결</span> : null}
      </div>
    </div>

    {status.source === "env" ? <p className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">지금은 서버 .env 값으로 동작합니다. 아래에 키를 등록하면 암호화 저장값이 우선 사용되고, 이후 .env의 키는 지워도 됩니다.</p> : null}
    {status.needsReencryption ? <p className="mt-4 border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">이전 암호화 키로 저장된 값입니다. 비밀 항목을 비워 둔 채 저장하면 현재 키로 다시 암호화됩니다.</p> : null}

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {status.fields.map((field) => {
        const registered = field.secret && Boolean(status.fingerprints[field.key]);
        return <label key={field.key} className="block text-sm">
          <span className="font-semibold">{field.label}{field.required ? <span className="text-[var(--cw-accent)]"> *</span> : null}{field.secret ? <span className="ml-2 text-xs font-normal text-[var(--cw-muted)]">입력 전용 · 저장 후 표시 안 함</span> : null}</span>
          <input
            type={field.secret ? "password" : "text"}
            autoComplete={field.secret ? "new-password" : "off"}
            spellCheck={false}
            value={values[field.key] || ""}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            placeholder={registered ? "등록됨 · 바꾸려면 새 값을 입력" : field.placeholder || ""}
            className="mt-2 w-full border border-[var(--cw-border)] bg-[var(--cw-paper)] px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--cw-accent)]"
          />
          {field.help ? <span className="mt-1 block text-xs text-[var(--cw-muted)]">{field.help}</span> : null}
        </label>;
      })}
    </div>

    <div className="mt-6 flex flex-wrap gap-2">
      <button type="button" onClick={() => void test()} disabled={busy !== null} className="inline-flex items-center gap-2 border border-[var(--cw-border)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} 연결 테스트</button>
      <button type="button" onClick={() => void save()} disabled={busy !== null} className="inline-flex items-center gap-2 border border-[var(--cw-accent)] bg-[var(--cw-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {status.source === "db" ? "저장" : "암호화 등록"}</button>
      {status.source === "db" ? <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy !== null} className="inline-flex items-center gap-2 border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50">{busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} 삭제</button> : null}
    </div>

    <ConfirmDialog
      isOpen={confirmDelete}
      title={`${status.label} 키 삭제`}
      message={`저장된 ${status.label} 키를 삭제합니다. 이미 수집한 원본은 유지되지만, 다시 등록하기 전까지 동기화가 멈춥니다.`}
      confirmText="삭제"
      type="danger"
      onConfirm={() => void remove()}
      onCancel={() => setConfirmDelete(false)}
    />
  </article>;
}
