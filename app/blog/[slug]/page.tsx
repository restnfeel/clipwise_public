import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { BlogPostDetailShell } from "@/components/blog/BlogPostDetailShell";
import { CwAuthNav } from "@/components/cw/CwAuthNav";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { renderSafeMarkdown } from "@/lib/blog/safe-markdown";
import { getPublishedPost } from "@/lib/blog/workspace-archive";

interface BlogPostVideo {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  thumbnail_url: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    return {
      title: "포스트를 찾을 수 없습니다 | Clipwise",
    };
  }

  return {
    title: `${post.title} | Clipwise 지식`,
    description: post.excerpt || post.content.substring(0, 160),
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="border-b border-[var(--cw-border)] bg-[var(--cw-paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-[var(--cw-ink)]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cw-accent)] text-white">C</span>CLIPWISE</Link>
          <div className="flex items-center gap-3"><div className="hidden sm:block"><CwAuthNav /></div><CwThemeToggle /><CwMobileNav /></div>
        </div>
      </header>
      <div className="relative min-h-screen bg-[var(--cw-paper)]">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 relative">
          <BlogPostDetailShell>
            <article className="blog-detail-article relative bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-stone-200/80 overflow-hidden">
              {/* Editorial accent: left border on large screens */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-400/60 via-brand-300/40 to-transparent hidden md:block rounded-l-2xl" aria-hidden />

              <div className="p-8 md:p-12 md:pl-14">
                <div className="mb-10 rounded-2xl border border-brand-200/60 bg-brand-50/50 p-6 text-sm text-stone-700 leading-relaxed">
                  <p className="font-semibold text-brand-800 mb-2">
                    클립와이즈는 AI를 이용한 지식시스템(LMS)을 만드는 서비스를 제공합니다.
                  </p>
                  <p>
                    현재 지식 아카이브는 RAG화된 간단 체험형이며, 실제 저작권은 유튜브 해당 채널에 있습니다.
                    구독 서비스는 2차가공된 LMS 서비스를 제공하며, 원 저작동영상 링크를 반드시 포함시켜 해당 동영상의 재조회를 도와주는 역할을 합니다.
                  </p>
                </div>

                <header className="mb-10">
                  <div className="h-px w-12 bg-brand-300/60 rounded-full mb-6" aria-hidden />
                  <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-stone-900 tracking-tight leading-[1.2]">
                    {post.title}
                  </h1>
                  <div className="flex items-center gap-3 mt-4 text-sm text-stone-500">
                    <time dateTime={post.published_at}>
                      {new Date(post.published_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <span className="text-stone-300">·</span>
                    {post.workspace ? (
                      <Link href={`/blog/workspace/${post.workspace.id}`} className="font-accent text-brand-600 font-medium hover:underline">
                        {post.workspace.displayName}
                      </Link>
                    ) : (
                      <span className="font-accent text-brand-600 font-medium">Clipwise</span>
                    )}
                  </div>
                </header>

                <BlogContentWithVideos
                  content={post.content}
                  videos={post.videos || []}
                />

                {post.videos && post.videos.length > 0 && (
                  <div className="mt-14 pt-10 border-t border-stone-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-px bg-brand-300/60 rounded-full" aria-hidden />
                      <h2 className="font-serif text-xl md:text-2xl font-bold text-stone-900">
                        참고 동영상
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {post.videos.map((video) => (
                        <a
                          key={video.id}
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-brand-50/40 hover:border-brand-200/60 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 w-14 h-10 bg-stone-200 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                            <svg
                              className="w-6 h-6 text-stone-600 group-hover:text-red-600 transition-colors"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-stone-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                              {video.video_title}
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">YouTube</p>
                          </div>
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                            <svg
                              className="w-4 h-4 text-stone-500 group-hover:text-brand-600 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </BlogPostDetailShell>
        </div>
      </div>
      <Footer />
    </main>
  );
}

/**
 * 동영상 썸네일 컴포넌트
 */
function VideoThumbnail({ video }: { video: BlogPostVideo }) {
  return (
    <div className="my-10">
      <a
        href={video.video_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative overflow-hidden rounded-xl border border-stone-200/80 shadow-sm hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] hover:border-brand-200/50 transition-all duration-300">
          <img
            src={video.thumbnail_url}
            alt={video.video_title}
            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <div className="bg-red-600 rounded-full p-4 opacity-95 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 shadow-lg">
              <svg
                className="w-8 h-8 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white font-medium text-sm line-clamp-2 drop-shadow-sm">
              {video.video_title}
            </p>
          </div>
        </div>
      </a>
    </div>
  );
}

/**
 * 지식 콘텐츠와 동영상 썸네일을 함께 렌더링하는 컴포넌트
 */
function BlogContentWithVideos({
  content,
  videos,
}: {
  content: string;
  videos: BlogPostVideo[];
}) {
  // 문단으로 분리
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  const totalParagraphs = paragraphs.length;

  // 동영상 삽입 위치 계산 (최대 3개)
  const maxVideosInContent = Math.min(videos.length, 3);
  const insertPositions: number[] = [];
  if (maxVideosInContent > 0 && totalParagraphs > 0) {
    if (maxVideosInContent === 1) {
      insertPositions.push(Math.floor(totalParagraphs / 2));
    } else if (maxVideosInContent === 2) {
      insertPositions.push(Math.floor(totalParagraphs / 3));
      insertPositions.push(Math.floor((totalParagraphs * 2) / 3));
    } else {
      insertPositions.push(Math.floor(totalParagraphs / 4));
      insertPositions.push(Math.floor(totalParagraphs / 2));
      insertPositions.push(Math.floor((totalParagraphs * 3) / 4));
    }
  }

  // 문단과 동영상을 함께 렌더링
  const elements: React.ReactNode[] = [];
  let videoIndex = 0;

  paragraphs.forEach((para, index) => {
    // 문단 렌더링
    const paraHtml = renderSafeMarkdown(para);
    elements.push(
      <div
        key={`para-${index}`}
        className="naver-blog-style"
        dangerouslySetInnerHTML={{ __html: paraHtml }}
      />
    );

    // 동영상 썸네일 삽입
    if (insertPositions.includes(index) && videoIndex < maxVideosInContent) {
      elements.push(
        <VideoThumbnail
          key={`video-${videoIndex}`}
          video={videos[videoIndex]}
        />
      );
      videoIndex++;
    }
  });

  return (
    <div className="blog-detail-content naver-blog-style text-stone-800 leading-relaxed">
      {elements}
    </div>
  );
}
