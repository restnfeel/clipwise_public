import Link from "next/link";
import { KeyRound, MoonStar } from "lucide-react";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { McpTokenSection } from "@/components/dashboard/McpTokenSection";
import { Footer } from "@/components/Footer";
import { requireAuth } from "@/lib/auth/route-guard";
import { CwPageHero } from "@/components/cw/CwPageHero";

export default async function McpTokenPage() {
  // 일반 사용자는 API에서 본인 토큰으로만 범위가 좁혀진다.
  await requireAuth();
  return <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-wide"><MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise</Link><div className="flex items-center gap-4"><CwThemeToggle /><CwMobileNav /></div></header><section className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8 md:pt-12"><CwPageHero eyebrow="Clipwise · MCP" icon={KeyRound} title="에이전트 연결을" accent="안전하게 관리합니다." description="내 MCP 인증키를 발급하고 폐기합니다. 키 원문은 발급 직후 한 번만 표시됩니다." /><McpTokenSection /></section><Footer /></main>;
}
