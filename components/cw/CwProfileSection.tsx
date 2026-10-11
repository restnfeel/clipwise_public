"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Edit3, Loader2, LogOut, Mail, Save, Shield, User, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { notice } from "@/lib/notice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  google_id?: string | null;
  kakao_id?: string | null;
  profile_image?: string | null;
};

const PROVIDER_LABEL: Record<"kakao" | "google", string> = { kakao: "카카오", google: "Google" };

export function CwProfileSection() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { user: UserProfile };
      })
      .then((data) => {
        setProfile(data.user);
        setName(data.user.name || "");
      })
      .catch(() => notice.error("내 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const displayName = name || session?.user?.name || "이름 없음";
  const email = profile?.email || session?.user?.email || "";
  const image = profile?.profile_image || session?.user?.image || null;
  const provider = session?.provider ?? (profile?.google_id ? "google" : "kakao");
  const linkedAccounts = [
    profile?.kakao_id ? "kakao" : null,
    profile?.google_id ? "google" : null,
  ].filter((value): value is "kakao" | "google" => value !== null);

  async function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      notice.error("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      setName(trimmed);
      setEditing(false);
      notice.success("이름이 저장되었습니다.");
    } catch (error) {
      notice.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    setWithdrawing(true);
    try {
      const response = await fetch("/api/user/withdraw", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "탈퇴 처리 중 오류가 발생했습니다.");
      }
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      notice.error(error instanceof Error ? error.message : "탈퇴 처리 중 오류가 발생했습니다.");
      setWithdrawing(false);
      setShowWithdrawDialog(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-[var(--cw-accent)]" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border border-[var(--cw-border)] bg-[var(--cw-panel)] px-6 py-8 md:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-[var(--cw-accent)]/20" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {image ? (
            <img src={image} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[var(--cw-accent)]/40" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[var(--cw-accent-soft)] text-[var(--cw-accent)]"><User className="h-9 w-9" /></div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">MY ACCOUNT</p>
            <h2 className="mt-2 truncate font-serif text-3xl md:text-4xl">{displayName}</h2>
            {email ? <p className="mt-2 flex items-center gap-2 text-sm text-[var(--cw-body)]"><Mail className="h-4 w-4 text-[var(--cw-accent)]" /> {email}</p> : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="border border-[var(--cw-border)] bg-[var(--cw-panel)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--cw-border)] px-6 py-5">
            <div>
              <p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">PROFILE</p>
              <h2 className="mt-2 font-serif text-2xl">프로필 이름</h2>
            </div>
            {!editing ? (
              <button type="button" onClick={() => { setDraftName(name); setEditing(true); }} className="inline-flex shrink-0 items-center gap-1.5 border border-[var(--cw-border)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)]" aria-label="이름 수정">
                <Edit3 className="h-3.5 w-3.5" /> 수정
              </button>
            ) : null}
          </div>
          <div className="space-y-5 p-6">
            {editing ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") void saveName(); }}
                  className="min-w-0 flex-1 border border-[var(--cw-border)] bg-[var(--cw-paper)] px-4 py-2.5 text-sm text-[var(--cw-ink)] outline-none transition focus:border-[var(--cw-accent)]"
                  placeholder="이름을 입력하세요"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void saveName()} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[var(--cw-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--cw-ink)] disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "저장 중..." : "저장"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} disabled={saving} className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-[var(--cw-muted)] transition hover:text-[var(--cw-ink)]">
                    <X className="h-4 w-4" /> 취소
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-serif text-xl">{displayName}</p>
            )}
            <div>
              <span className="text-xs text-[var(--cw-muted)]">이메일</span>
              <p className="mt-1 text-sm text-[var(--cw-body)]">{email || "-"}</p>
            </div>
          </div>
        </article>

        <article className="border border-[var(--cw-border)] bg-[var(--cw-panel)]">
          <div className="border-b border-[var(--cw-border)] px-6 py-5">
            <p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">SIGN-IN</p>
            <h2 className="mt-2 flex items-center gap-2 font-serif text-2xl"><Shield className="h-5 w-5 text-[var(--cw-accent)]" /> 로그인 계정</h2>
          </div>
          <div className="space-y-4 p-6">
            {linkedAccounts.length === 0 ? (
              <p className="text-sm text-[var(--cw-muted)]">연결된 소셜 계정 정보가 없습니다.</p>
            ) : (
              linkedAccounts.map((account) => (
                <div key={account} className="flex items-center justify-between border border-[var(--cw-border)] bg-[var(--cw-paper)] px-4 py-3">
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${account === "kakao" ? "bg-[#FEE500] text-black" : "border border-[var(--cw-border)] bg-white text-[#4285F4]"}`}>{account === "kakao" ? "K" : "G"}</span>
                    {PROVIDER_LABEL[account]} 계정
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--cw-accent)]"><CheckCircle className="h-3.5 w-3.5" /> {account === provider ? "현재 로그인" : "연결됨"}</span>
                </div>
              ))
            )}
            <div>
              <span className="text-xs text-[var(--cw-muted)]">사용자 ID</span>
              <p className="mt-1 break-all font-mono text-xs text-[var(--cw-body)]">{profile?.id || session?.user?.id || "-"}</p>
            </div>
          </div>
        </article>
      </div>

      <article className="border border-red-500/30 bg-[var(--cw-panel)]">
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.24em] text-red-500">DANGER ZONE</p>
            <h2 className="mt-2 font-serif text-2xl">회원 탈퇴</h2>
            <p className="mt-1 text-sm text-[var(--cw-body)]">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
          </div>
          <button type="button" onClick={() => setShowWithdrawDialog(true)} disabled={withdrawing} className="inline-flex shrink-0 items-center justify-center gap-2 border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50">
            <LogOut className="h-4 w-4" /> {withdrawing ? "탈퇴 처리 중..." : "회원 탈퇴"}
          </button>
        </div>
      </article>

      <ConfirmDialog
        isOpen={showWithdrawDialog}
        title="회원 탈퇴 확인"
        message="정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 삭제됩니다."
        confirmText="탈퇴하기"
        cancelText="취소"
        type="danger"
        onConfirm={() => void withdraw()}
        onCancel={() => setShowWithdrawDialog(false)}
      />
    </div>
  );
}
