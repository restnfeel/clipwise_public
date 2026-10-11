import Link from "next/link";
import { MoonStar } from "lucide-react";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwProfileSection } from "@/components/cw/CwProfileSection";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { Footer } from "@/components/Footer";
import { requireAuth } from "@/lib/auth/route-guard";
import { CwPageHero } from "@/components/cw/CwPageHero";

export default async function ProfilePage() {
  await requireAuth();

  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise
        </Link>
        <div className="flex items-center gap-4">
          <CwThemeToggle />
          <CwMobileNav />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <CwPageHero eyebrow="Clipwise · My" title="나를" accent="돌아보는 자리." description="프로필과 로그인 계정을 한곳에서 관리합니다." />
        <CwProfileSection />
      </section>
      <Footer />
    </main>
  );
}
