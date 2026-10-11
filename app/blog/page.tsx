import type { Metadata } from "next";
import Link from "next/link";
import { MoonStar } from "lucide-react";
import { WorkspaceCover } from "@/components/blog/WorkspaceCover";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { Footer } from "@/components/Footer";
import { listArchiveWorkspaces } from "@/lib/blog/workspace-archive";

export const metadata: Metadata = {
  title: "지식 아카이브 | Clipwise",
  description: "Clipwise 워크스페이스들이 공개한 기록과 통찰을 모아 봅니다.",
};

export const dynamic = "force-dynamic";

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("ko-KR") : "공개됨");

export default async function BlogPage() {
  const workspaces = await listArchiveWorkspaces();

  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide"><MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise</Link>
        <div className="flex items-center gap-3"><CwThemeToggle /><CwMobileNav /></div>
      </header>
      <section className="mx-auto max-w-5xl px-5 pb-24 pt-12 md:px-8 md:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--cw-accent)]">Clipwise · Archive</p>
        <h1 className="mt-5 font-serif text-4xl leading-tight md:text-6xl">기록을 다시 꺼내<br /><span className="text-[var(--cw-accent)]">오늘의 통찰로.</span></h1>
        <p className="mt-6 max-w-xl text-sm leading-8 text-[var(--cw-muted)]">워크스페이스를 골라 공개된 지식 기록을 읽어보세요.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/blog/workspace/${workspace.id}`} className="group overflow-hidden rounded-3xl border border-[var(--cw-border)] bg-[var(--cw-panel)] transition hover:-translate-y-1 hover:border-[var(--cw-accent)]">
              <div className="aspect-video overflow-hidden border-b border-[var(--cw-border)]">
                <WorkspaceCover coverUrl={workspace.coverUrl} fallbackImage={workspace.fallbackImage} name={workspace.name} className="transition duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-6">
                <h2 className="font-serif text-2xl leading-tight group-hover:text-[var(--cw-accent)]">{workspace.displayName}</h2>
                <p className="mt-3 text-xs text-[var(--cw-muted)]">공개 지식 {workspace.postCount.toLocaleString("ko-KR")}건 · 최근 {formatDate(workspace.lastPublishedAt)}</p>
                <span className="mt-5 inline-block text-xs font-semibold text-[var(--cw-accent)]">지식 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
        {workspaces.length === 0 ? <div className="mt-12 rounded-3xl border border-dashed border-[var(--cw-border)] p-12 text-center text-sm text-[var(--cw-muted)]">아직 공개된 기록이 없습니다.</div> : null}
      </section>
      <Footer />
    </main>
  );
}
