import Link from "next/link";
import { MoonStar } from "lucide-react";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { AgentActivitySection } from "@/components/dashboard/AgentActivitySection";
import { Footer } from "@/components/Footer";
import { requireAuth } from "@/lib/auth/route-guard";
import { CwPageHero } from "@/components/cw/CwPageHero";

export default async function AgentActivityPage() {
  await requireAuth();
  return <main className="cw-joseph min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-wide"><MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise</Link><div className="flex items-center gap-4"><CwThemeToggle /><CwMobileNav /></div></header><section className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8 md:pt-12"><CwPageHero eyebrow="Clipwise · Agent" title="내 에이전트의" accent="작동 기록." description="Claude가 어떤 지식을 참고했는지 확인하고, 답변 품질을 직접 평가해 다음 실행을 개선합니다." /><AgentActivitySection /></section><Footer /></main>;
}
