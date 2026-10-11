import Link from "next/link";
import { MoonStar } from "lucide-react";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { Footer } from "@/components/Footer";
import { KnowledgeHubSection } from "@/components/knowledge/KnowledgeHubSection";
import { requireAuth } from "@/lib/auth/route-guard";
import { CwPageHero } from "@/components/cw/CwPageHero";

export default async function KnowledgeManagementPage() {
  await requireAuth();
  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise
        </Link>
        <div className="flex items-center gap-4">
          <CwThemeToggle />
          <CwMobileNav />
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <CwPageHero eyebrow="Clipwise · Knowledge" title="쌓인 원본을" accent="함께 쓰는 지식으로." description="구조화된 지식 카드를 검색하고 검토해, 승인된 지식만 Claude와 공유합니다." />
        <KnowledgeHubSection />
      </section>
      <Footer />
    </main>
  );
}
