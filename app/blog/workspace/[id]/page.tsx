import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, MoonStar } from "lucide-react";
import { WorkspaceCover } from "@/components/blog/WorkspaceCover";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { Footer } from "@/components/Footer";
import { getArchiveWorkspace, listWorkspacePosts } from "@/lib/blog/workspace-archive";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const workspace = await getArchiveWorkspace((await params).id);
  if (!workspace) return { title: "워크스페이스를 찾을 수 없습니다 | Clipwise" };
  return {
    title: `${workspace.displayName} | 지식 아카이브`,
    description: `${workspace.displayName}가 공개한 지식 기록 ${workspace.postCount.toLocaleString("ko-KR")}건`,
  };
}

export default async function WorkspaceArchivePage({ params }: Props) {
  const { id } = await params;
  const workspace = await getArchiveWorkspace(id);
  if (!workspace) notFound();
  const posts = await listWorkspacePosts(workspace.id);

  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide"><MoonStar className="h-5 w-5 text-[var(--cw-accent)]" /> Clipwise</Link>
        <div className="flex items-center gap-3"><CwThemeToggle /><CwMobileNav /></div>
      </header>
      <section className="mx-auto max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
        <Link href="/blog" className="text-xs font-semibold text-[var(--cw-muted)] hover:text-[var(--cw-accent)]">← 전체 워크스페이스</Link>
        <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--cw-border)]">
          <div className="h-48 md:h-64">
            <WorkspaceCover coverUrl={workspace.coverUrl} fallbackImage={workspace.fallbackImage} name={workspace.name} />
          </div>
        </div>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.28em] text-[var(--cw-accent)]">Clipwise · Archive</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{workspace.displayName}</h1>
        <p className="mt-4 text-sm text-[var(--cw-muted)]">공개 지식 {workspace.postCount.toLocaleString("ko-KR")}건</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slugid || post.slug}`} className="group rounded-3xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6 transition hover:-translate-y-1 hover:border-[var(--cw-accent)]">
              <div className="flex items-center gap-2 text-xs text-[var(--cw-muted)]"><FileText className="h-4 w-4 text-[var(--cw-accent)]" /><span>{post.category || "기록"}</span><span>·</span><time>{post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR") : "공개됨"}</time></div>
              <h2 className="mt-5 font-serif text-2xl leading-tight group-hover:text-[var(--cw-accent)]">{post.title}</h2>
              {post.excerpt ? <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--cw-muted)]">{post.excerpt}</p> : null}
              <span className="mt-6 inline-block text-xs font-semibold text-[var(--cw-accent)]">읽어보기 →</span>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
