"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  FileAudio,
  FileText,
  Loader2,
  Network,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { notice } from "@/lib/notice";
import { CwMobileNav } from "@/components/cw/CwMobileNav";
import { CwThemeToggle } from "@/components/cw/CwThemeToggle";
import { Footer } from "@/components/Footer";

type KnowledgeItem = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  topics: string[];
  updated_at: string;
  source_system?: string | null;
};

const statusText: Record<string, string> = {
  ready: "공유 가능",
  reviewed: "공유 가능",
  published: "공유 가능",
  draft: "검토 대기",
  processing: "처리 중",
  failed: "확인 필요",
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const response = await fetch("/api/knowledge?limit=100", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "지식 흐름을 읽지 못했습니다.");
      setItems((body.items || []) as KnowledgeItem[]);
    } catch (error) {
      notice.error(error instanceof Error ? error.message : "지식 흐름을 읽지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=%2Fdashboard");
    if (status === "authenticated") {
      void load();
    }
  }, [status, router, load]);

  const stats = useMemo(() => ({
    total: items.length,
    ready: items.filter((item) => item.status === "ready" || item.status === "reviewed" || item.status === "published").length,
    review: items.filter((item) => item.status === "draft" || item.status === "processing").length,
    topics: new Set(items.flatMap((item) => item.topics || [])).size,
  }), [items]);

  const trend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const count = items.filter((item) => item.updated_at?.slice(0, 10) === key).length;
      return { key, label: date.toLocaleDateString("ko-KR", { weekday: "short" }), count };
    });
  }, [items]);

  const maxTrend = Math.max(...trend.map((day) => day.count), 1);
  const recentItems = items.slice(0, 5);

  if (status === "loading" || status === "unauthenticated") {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--cw-paper)]"><Loader2 className="h-7 w-7 animate-spin text-[var(--cw-accent)]" /></div>;
  }

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    notice.success("workspace를 새로고침했습니다.");
  };

  return (
    <main className="min-h-screen bg-[var(--cw-paper)] text-[var(--cw-ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--cw-border)] bg-[var(--cw-paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 text-sm font-semibold tracking-[0.14em]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cw-accent)] text-white"><Sparkles className="h-4 w-4" /></span>CLIPWISE</Link>
          <div className="flex items-center gap-3"><CwThemeToggle /><CwMobileNav /></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-8 md:py-12">
        <section className="relative overflow-hidden border border-[var(--cw-border)] bg-[var(--cw-panel)] px-6 py-8 text-[var(--cw-ink)] md:px-10 md:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-[var(--cw-accent)]/20" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div><p className="text-[10px] font-bold tracking-[0.28em] text-[var(--cw-accent)]">CLIPWISE WORKSPACE / OVERVIEW</p><h1 className="mt-5 max-w-2xl font-serif text-4xl leading-tight md:text-6xl">원본을 지식으로,<br /><span className="text-[var(--cw-accent)]">필요한 순간 다시.</span></h1><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--cw-body)]">구성원이 사용한 Tiro 원본을 API로 연계하고, 검토 가능한 지식으로 정리해 Claude와 공유합니다.</p></div>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex shrink-0 items-center gap-2 self-start border border-[var(--cw-border)] px-4 py-3 text-sm font-semibold text-[var(--cw-ink)] transition hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)] disabled:opacity-50 md:self-auto"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> 새로고침</button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="전체 지식" value={stats.total} suffix="개" icon={BrainCircuit} note="workspace에 쌓인 카드" />
          <Metric label="공유 가능" value={stats.ready} suffix="개" icon={Check} note="Claude가 검색할 수 있음" accent />
          <Metric label="검토 큐" value={stats.review} suffix="개" icon={FileText} note="확인 후 공유할 원본" />
          <Metric label="발견된 주제" value={stats.topics} suffix="개" icon={Zap} note="지식 카드의 연결어" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <article className="border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6 md:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">KNOWLEDGE ACTIVITY</p><h2 className="mt-2 font-serif text-2xl">최근 7일 지식 흐름</h2></div><span className="text-xs text-[var(--cw-muted)]">업데이트 기준</span></div>
            <div className="mt-8 flex h-48 items-end gap-2 border-b border-l border-[var(--cw-border)] px-2 pb-0 pt-4 sm:gap-4">{trend.map((day) => <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-3"><span className="text-[10px] text-[var(--cw-muted)]">{day.count || ""}</span><div className="w-full max-w-10 rounded-t-sm bg-[var(--cw-accent)] transition-all" style={{ height: `${Math.max(day.count / maxTrend * 78, day.count ? 10 : 3)}%`, opacity: day.count ? 1 : .2 }} /><span className="text-[10px] text-[var(--cw-muted)]">{day.label}</span></div>)}</div>
            <p className="mt-5 text-sm leading-6 text-[var(--cw-body)]">Tiro 원본이 동기화되고 지식 카드로 정리될수록 이 흐름이 쌓입니다.</p>
          </article>
          <article className="border border-[var(--cw-border)] bg-[var(--cw-accent-soft)] p-6 md:p-8"><p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent-active)]">THE CORE LOOP</p><h2 className="mt-2 font-serif text-2xl">원본에서 에이전트까지</h2><div className="mt-7 space-y-3"><PipelineStep number="01" icon={FileAudio} title="Tiro API 연계" text="STT 원본을 가져옵니다." active={stats.total > 0} /><PipelineStep number="02" icon={BrainCircuit} title="검토 가능한 지식" text="요약·주제·결정을 구조화합니다." active={stats.total > 0} /><PipelineStep number="03" icon={Network} title="Claude MCP 공유" text="승인된 지식만 에이전트에 공개합니다." active={stats.ready > 0} /></div><Link href="/dashboard/sources" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--cw-accent-active)]">연결 상태 확인 <ArrowRight className="h-4 w-4" /></Link></article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="border border-[var(--cw-border)] bg-[var(--cw-panel)]"><div className="flex items-end justify-between border-b border-[var(--cw-border)] px-6 py-5"><div><p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent)]">RECENT KNOWLEDGE</p><h2 className="mt-2 font-serif text-2xl">최근 지식 카드</h2></div><Link href="/dashboard/knowledge" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--cw-accent)]">전체 보기 <ChevronRight className="h-4 w-4" /></Link></div>{loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--cw-accent)]" /></div> : recentItems.length === 0 ? <EmptyState /> : <ul className="divide-y divide-[var(--cw-border)]">{recentItems.map((item) => <li key={item.id} className="flex items-start gap-4 px-6 py-5"><div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cw-accent-soft)] text-[var(--cw-accent)]"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cw-accent)]">{statusText[item.status] || item.status}</span>{item.source_system ? <span className="text-[10px] text-[var(--cw-muted)]">· {item.source_system}</span> : null}</div><h3 className="mt-1 truncate font-serif text-lg">{item.title}</h3><p className="mt-1 line-clamp-1 text-sm text-[var(--cw-body)]">{item.summary || "요약을 준비 중입니다."}</p></div><span className="hidden shrink-0 text-xs text-[var(--cw-muted)] sm:block">{formatDate(item.updated_at)}</span></li>)}</ul>}</article>
        <aside className="border border-[var(--cw-border)] bg-[var(--cw-accent-soft)] p-6 text-[var(--cw-ink)] md:p-7"><p className="text-[10px] font-bold tracking-[0.24em] text-[var(--cw-accent-active)]">NEXT ACTION</p><h2 className="mt-3 font-serif text-3xl leading-tight">팀의 첫 원본을<br />연결해보세요.</h2><p className="mt-4 text-sm leading-7 text-[var(--cw-body)]">Tiro 노트를 동기화하면 Clipwise가 지식 카드와 Claude 연결 준비를 시작합니다.</p><Link href="/dashboard/sources" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--cw-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--cw-ink)]">원본 모으기 <ArrowRight className="h-4 w-4" /></Link></aside>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function Metric({ label, value, suffix, icon: Icon, note, accent = false }: { label: string; value: number; suffix: string; icon: typeof BrainCircuit; note: string; accent?: boolean }) {
  return <article className={`border p-5 ${accent ? "border-[var(--cw-accent)] bg-[var(--cw-accent-soft)]" : "border-[var(--cw-border)] bg-[var(--cw-panel)]"}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[var(--cw-muted)]">{label}</span><Icon className={`h-5 w-5 ${accent ? "text-[var(--cw-accent)]" : "text-[var(--cw-muted)]"}`} /></div><p className="mt-5 font-serif text-4xl">{value}<span className="ml-1 text-base font-sans text-[var(--cw-muted)]">{suffix}</span></p><p className="mt-2 text-xs text-[var(--cw-muted)]">{note}</p></article>;
}

function PipelineStep({ number, icon: Icon, title, text, active }: { number: string; icon: typeof FileAudio; title: string; text: string; active: boolean }) {
  return <div className="flex items-center gap-3 border-b border-[var(--cw-border)]/70 pb-3 last:border-0"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${active ? "bg-[var(--cw-accent)] text-white" : "bg-white/70 text-[var(--cw-muted)]"}`}>{number}</span><Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--cw-accent)]" : "text-[var(--cw-muted)]"}`} /><div><p className="text-sm font-semibold text-[var(--cw-ink)]">{title}</p><p className="mt-0.5 text-xs text-[var(--cw-body)]">{text}</p></div></div>;
}

function EmptyState() {
  return <div className="px-6 py-14 text-center"><Sparkles className="mx-auto h-8 w-8 text-[var(--cw-accent)]" /><p className="mt-4 font-serif text-xl">아직 지식 카드가 없습니다.</p><p className="mt-2 text-sm text-[var(--cw-muted)]">Tiro 원본을 연결하면 이곳에 팀의 지식이 쌓입니다.</p><Link href="/dashboard/sources" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--cw-accent)] px-4 py-2.5 text-sm font-semibold text-white">첫 원본 연결하기 <ArrowRight className="h-4 w-4" /></Link></div>;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
