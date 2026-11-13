"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { notice } from "@/lib/notice";
import type { CompanyGuide } from "@/lib/setup/company-guides";

type CopyState = "idle" | "ok" | "fail";

export function SetupGuideLinks({ guides }: { guides: CompanyGuide[] }) {
  const [copyState, setCopyState] = useState<Record<string, CopyState>>({});

  if (guides.length === 0) return null;

  const copy = async (guide: CompanyGuide) => {
    let ok = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(guide.url);
      notice.success("안내 주소를 복사했습니다.");
      ok = true;
    } catch {
      notice.error("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
    setCopyState((current) => ({ ...current, [guide.id]: ok ? "ok" : "fail" }));
    window.setTimeout(() => {
      setCopyState((current) => ({ ...current, [guide.id]: "idle" }));
    }, 2500);
  };

  return (
    <section className="mt-10 border-t border-[var(--cw-border)] pt-8">
      <p className="text-xs font-bold tracking-[0.22em] text-[var(--cw-accent)]">SETUP GUIDES</p>
      <h2 className="mt-3 font-serif text-2xl">설치 안내 주소</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--cw-body)]">
        회사 사이트에 둔 공개 안내입니다. 주소를 열거나 복사해 에이전트에 넘겨 주세요. 비밀값·비밀번호는 이 화면에 없습니다.
      </p>
      <ul className="mt-6 grid gap-4">
        {guides.map((guide) => {
          const state = copyState[guide.id] || "idle";
          return (
            <li key={guide.id} className="border border-[var(--cw-border)] bg-[var(--cw-paper)] p-4 md:p-5">
              <h3 className="text-base font-semibold text-[var(--cw-ink)]">{guide.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--cw-body)]">{guide.description}</p>
              <p className="mt-3 select-all break-all font-mono text-xs leading-6 text-[var(--cw-muted)]">{guide.url}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={guide.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-[var(--cw-accent)] px-4 py-2 text-sm font-semibold text-[var(--cw-accent)]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  열기
                </a>
                <button
                  type="button"
                  onClick={() => void copy(guide)}
                  className="inline-flex items-center gap-2 border border-[var(--cw-border)] px-4 py-2 text-sm font-semibold text-[var(--cw-ink)]"
                  aria-label={`${guide.title} 주소 복사`}
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  {state === "ok" ? "복사했습니다" : state === "fail" ? "복사 실패" : "주소 복사"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
