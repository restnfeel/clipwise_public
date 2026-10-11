import Link from "next/link";
import { MoonStar } from "lucide-react";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { TiroNotesSection } from "@/components/dashboard/TiroNotesSection";
import { Footer } from "@/components/Footer";
import { requireAuth } from "@/lib/auth/route-guard";

export default async function SourcesPage() {
  await requireAuth();
  return <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8"><Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-wide"><MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise</Link><div className="flex items-center gap-4"><CwThemeToggle /><CwMobileNav /></div></header><section className="mx-auto max-w-7xl px-5 pb-16 pt-8 md:px-8 md:pt-12"><TiroNotesSection /></section><Footer /></main>;
}
