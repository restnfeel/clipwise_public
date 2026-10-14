import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, FileText, Headphones, MessageCircle, Mic2, Search, Sparkles, Upload } from "lucide-react";
import { Footer } from "@/components/Footer";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { redirect } from "next/navigation";
import { getDatabaseSetupStatus } from "@/lib/setup/database-status";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
export const metadata: Metadata = {
  title: "Clipwise | 녹음 노트가 나만의 지식 웹사이트가 됩니다",
  description: "Tiro의 녹음 노트를 요약하고, 검색되는 나만의 지식 웹사이트로 정리하세요.",
  alternates: { canonical: `${APP_URL}/` },
  openGraph: {
    title: "Clipwise | 녹음 노트가 나만의 지식 웹사이트가 됩니다",
    description: "Tiro의 녹음 노트를 요약하고, 검색되는 나만의 지식 웹사이트로 정리하세요.",
    url: `${APP_URL}/`,
    siteName: "Clipwise",
    type: "website",
  },
};

const homeFaq = [
  { question: "Tiro가 뭔가요?", answer: "Tiro는 예배, 회의, 강의 등을 녹음하면 말한 내용을 글로 받아 적어 주는 음성 기록 앱입니다." },
  { question: "Plaud도 쓸 수 있나요?", answer: "Plaud 연동은 지원 예정입니다. 현재는 Tiro 연결부터 제공합니다." },
  { question: "원본은 어떻게 되나요?", answer: "녹음에서 만들어진 원본 노트는 그대로 보존하고, 정리된 결과와 함께 확인할 수 있습니다." },
  { question: "클로드가 마음대로 공개하나요?", answer: "아니요. 초안과 미리보기를 확인하고 사용자가 승인한 결과만 공개됩니다." },
  { question: "AI 검색 관리란 무엇인가요?", answer: "공개 페이지의 답변, 요약, FAQ, 구조화 데이터를 점검해 AI가 내용을 읽고 인용하기 쉬운 형태로 관리하는 기능입니다." },
];

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clipwise",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: `${APP_URL}/`,
  description: "Tiro의 녹음 노트를 요약하고 검색되는 나만의 지식 웹사이트로 정리하는 서비스",
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaq.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

const flow = [
  { number: "01", label: "녹음", title: "말한 그대로 쌓이고", text: "예배, 회의, 강의를 녹음하면 Tiro가 말한 내용을 글로 받아 적습니다.", icon: Mic2 },
  { number: "02", label: "요약 정리", title: "긴 노트가 짧아지고", text: "요약·결정사항·할 일을 한눈에 다시 쓸 수 있는 기록으로 정리합니다.", icon: Sparkles },
  { number: "03", label: "지식 웹", title: "필요할 때 다시 찾고", text: "정리된 노트가 검색되고 링크로 공유되는 나만의 사이트가 됩니다.", icon: Search },
];

const benefits = [
  { title: "요약 정리", text: "긴 녹음을 요약하고 결정사항과 할 일을 자동으로 정리합니다.", icon: Sparkles, tone: "bg-[#fff0f3] text-[#e00b41]" },
  { title: "나만의 지식 웹", text: "정리된 노트가 검색되고 링크로 공유되는 내 사이트를 만듭니다.", icon: Search, tone: "bg-[#eef7f2] text-[#277453]" },
  { title: "클로드로 쉽게 관리", text: "‘지난주 회의 결정사항 보여줘’처럼 말로 찾고 정리합니다.", icon: MessageCircle, tone: "bg-[#f1efff] text-[#6754b7]" },
];

const cases = [
  { label: "단체", title: "지식 아카이브", text: "모임과 강의 노트를 주제별 지식으로 다시 읽습니다.", quote: "이번 달 노트 중 ‘기다림’을 다룬 내용을 모아줘", accent: "#f25f5c", icon: FileText },
  { label: "회사", title: "팀 회의록", text: "결정된 일과 다음 액션을 놓치지 않습니다.", quote: "지난주 회의에서 결정된 일과 담당자를 보여줘", accent: "#2b7a68", icon: MessageCircle },
  { label: "개인", title: "학습 노트", text: "강의와 대화에서 얻은 생각을 내 지식으로 쌓습니다.", quote: "이 노트들에서 반복해서 나온 개념을 정리해줘", accent: "#7561c7", icon: Headphones },
];

function NoteWindow({ compact = false }: { compact?: boolean }) {
  return <div className={`relative overflow-hidden rounded-[24px] border border-[#ded8d0] bg-[#fffdfa] shadow-[0_18px_50px_rgba(75,55,36,0.12)] ${compact ? "p-4" : "p-5 md:p-7"}`}>
    <div className="flex items-center gap-1.5 border-b border-[#eee8e0] pb-4"><span className="h-2.5 w-2.5 rounded-full bg-[#f25f5c]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e7b94a]" /><span className="h-2.5 w-2.5 rounded-full bg-[#6ab38f]" /><span className="ml-auto text-[10px] font-bold tracking-[0.18em] text-[#9b9188]">CLIPWISE NOTE</span></div>
    <div className="mt-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#f25f5c]">TIRO · 09.30</p><h3 className="mt-2 font-serif text-xl text-[#2d2925]">이번 주 팀 미팅</h3></div><span className="rounded-full bg-[#eef7f2] px-2.5 py-1 text-[10px] font-semibold text-[#277453]">정리 완료</span></div>
    <div className="mt-5 space-y-2.5"><div className="h-2.5 w-full rounded-full bg-[#ede7df]" /><div className="h-2.5 w-[89%] rounded-full bg-[#ede7df]" /><div className="h-2.5 w-[67%] rounded-full bg-[#ede7df]" /></div>
    <div className="mt-6 rounded-2xl bg-[#f8f3ec] p-4"><p className="text-[10px] font-bold tracking-[0.15em] text-[#9b6d39]">요약</p><p className="mt-2 text-sm leading-6 text-[#51483f]">신규 고객 온보딩 문서를 금요일까지 업데이트합니다.</p></div>
    {!compact && <div className="mt-5 flex items-center gap-2 text-xs text-[#877c71]"><Sparkles className="h-4 w-4 text-[#f25f5c]" /> 결정사항 3개 · 할 일 5개 · 검색 가능</div>}
  </div>;
}

function WebResult({ accent, title, quote, Icon }: { accent: string; title: string; quote: string; Icon: typeof FileText }) {
  return <div className="relative rounded-[24px] border border-[#ded8d0] bg-[#fffdfa] p-5 shadow-[0_18px_50px_rgba(75,55,36,0.1)]"><div className="flex items-center justify-between border-b border-[#eee8e0] pb-4"><span className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#766c63]"><span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ backgroundColor: accent }}><Icon className="h-3.5 w-3.5" /></span> MY KNOWLEDGE WEB</span><span className="text-[10px] text-[#a0968c]">공개 페이지</span></div><p className="mt-5 text-[10px] font-bold tracking-[0.16em]" style={{ color: accent }}>RECENTLY ORGANIZED</p><h3 className="mt-2 font-serif text-2xl text-[#2d2925]">{title}</h3><div className="mt-5 space-y-2"><div className="h-2.5 w-[90%] rounded-full bg-[#eee8e0]" /><div className="h-2.5 w-[76%] rounded-full bg-[#eee8e0]" /><div className="h-2.5 w-[58%] rounded-full bg-[#eee8e0]" /></div><div className="mt-6 rounded-2xl p-4" style={{ backgroundColor: `${accent}12` }}><p className="text-xs font-semibold leading-6 text-[#51483f]">“{quote}”</p></div></div>;
}

export default async function Home() {
  const database = await getDatabaseSetupStatus().catch(() => ({ ready: true, missing: [], unavailable: true }));
  if (database.missing.length > 0) redirect("/setup?reason=missing-tables");
  return <main className="min-h-screen overflow-hidden bg-[#fbf8f3] text-[#2d2925]">
    <LandingHeader />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

    <section className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24 lg:grid-cols-[1.03fr_.97fr] lg:items-center">
      <div className="relative z-10"><p className="text-xs font-bold tracking-[0.2em] text-[#f25f5c]">TIRO로 시작하는 CLIPWISE</p><h1 className="mt-6 max-w-3xl font-serif text-[3.4rem] leading-[1.08] tracking-[-0.06em] md:text-[5.7rem]">녹음 노트가<br /><span className="text-[#f25f5c]">나만의 지식 웹사이트</span>가 됩니다.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#665d55] md:text-xl">녹음은 그대로, 요약은 자동으로, 관리는 클로드에게 말로 하세요.</p><Link href="/login" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#f25f5c] px-7 py-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(242,95,92,0.24)] transition hover:-translate-y-0.5 hover:bg-[#dc4c49]">무료로 시작하기 <ArrowRight className="h-4 w-4" /></Link><p className="mt-4 text-xs text-[#9b9188]">로그인하면 바로 Clipwise를 직접 사용해 볼 수 있어요.</p></div>
      <div className="relative mx-auto w-full max-w-[540px] lg:mt-6"><div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#f6d8d0] blur-[2px]" /><div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-[#e6edcf]" /><div className="relative rotate-[1.5deg]"><NoteWindow /></div><div className="absolute -bottom-7 -left-7 max-w-[230px] -rotate-3 rounded-2xl bg-[#2d2925] px-5 py-4 text-white shadow-xl"><p className="text-[10px] font-bold tracking-[0.18em] text-[#ffb9b3]">A NOTE BECOMES</p><p className="mt-2 font-serif text-lg leading-6">찾을 수 있는<br />내 사이트</p></div></div>
    </section>

    <section className="border-y border-[#e9e1d7] bg-[#f5efe7] px-5 py-16 md:px-10 md:py-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold tracking-[0.18em] text-[#9b6d39]">먼저 이해하기</p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em] md:text-5xl">이런 서비스를 쓰고 계신가요?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#71675d]">Clipwise는 이미 사용 중인 녹음 도구의 다음 장면을 만듭니다.</p><div className="mt-10 grid gap-5 md:grid-cols-2"><article className="rounded-[24px] border border-[#e2d6c9] bg-[#fffdfa] p-6 md:p-8"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff0f3] text-[#e00b41]"><Mic2 className="h-6 w-6" /></div><span className="rounded-full bg-[#fff0f3] px-3 py-1 text-xs font-semibold text-[#e00b41]">지금 연결</span></div><h3 className="mt-7 font-serif text-2xl">Tiro</h3><p className="mt-3 text-sm leading-7 text-[#62584f]">말한 내용을 글로 받아 적어 주는 음성 기록 앱입니다. 예배, 회의, 강의를 녹음하면 텍스트 노트가 쌓입니다.</p></article><article className="rounded-[24px] border border-[#e2d6c9] bg-[#fffdfa] p-6 md:p-8"><div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0f2f7] text-[#556581]"><Headphones className="h-6 w-6" /></div><span className="rounded-full bg-[#f0f2f7] px-3 py-1 text-xs font-semibold text-[#556581]">지원 예정</span></div><h3 className="mt-7 font-serif text-2xl">Plaud</h3><p className="mt-3 text-sm leading-7 text-[#62584f]">녹음 전용 휴대용 AI 기기입니다. 대화를 녹음하면 요약된 노트를 만들어 줍니다.</p><p className="mt-5 text-xs font-semibold text-[#8b8176]">Clipwise 연동은 지원 예정입니다.</p></article></div><p className="mt-8 max-w-4xl font-serif text-xl leading-8 text-[#433b34] md:text-2xl">이런 서비스는 녹음을 글로 바꿔 주지만, 노트가 쌓일수록 다시 찾아 쓰기 어렵습니다. <span className="text-[#f25f5c]">Clipwise가 그 노트를 정리해서 검색되는 나만의 사이트로 만들어 줍니다.</span></p></div></section>

    <section id="how" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28"><div className="flex items-end justify-between gap-6"><div><p className="text-xs font-bold tracking-[0.18em] text-[#f25f5c]">THE FLOW</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] md:text-6xl">녹음 하나가<br />웹페이지가 되는 과정.</h2></div><ArrowDownRight className="hidden h-12 w-12 text-[#f25f5c] md:block" /></div><div className="mt-14 grid gap-5 md:grid-cols-3">{flow.map(({ number, label, title, text, icon: Icon }, index) => <article key={number} className="relative rounded-[24px] border border-[#e2d9cf] bg-[#fffdfa] p-6 md:p-7"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-[#f25f5c]">{number}</span><Icon className="h-5 w-5 text-[#9b6d39]" /></div><p className="mt-10 text-xs font-bold tracking-[0.16em] text-[#9b9188]">{label}</p><h3 className="mt-3 font-serif text-2xl">{title}</h3><p className="mt-4 text-sm leading-7 text-[#71675d]">{text}</p>{index < 2 && <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-7 w-7 rounded-full bg-[#f5efe7] p-1.5 text-[#f25f5c] md:block" />}</article>)}</div><div className="mt-10 grid items-center gap-6 rounded-[28px] bg-[#2d2925] p-5 md:grid-cols-[.9fr_auto_.9fr] md:p-8"><NoteWindow compact /><ArrowRight className="mx-auto hidden h-8 w-8 text-[#ffb9b3] md:block" /><WebResult accent="#f25f5c" title="팀 미팅 기록" quote="업무가 기억되는 방식이 달라집니다" Icon={FileText} /></div></section>

    <section className="border-y border-[#e9e1d7] bg-[#fffdfa] px-5 py-20 md:px-10 md:py-24"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-[#f25f5c]">THE AGENT SITE</p><h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.05em] md:text-6xl">녹음 노트가 쌓이면,<br />내 사이트가 스스로 일하는 에이전트가 됩니다.</h2></div><p className="max-w-sm text-sm leading-7 text-[#71675d]">기록을 모으는 데서 멈추지 않고, 필요한 내용을 찾아 정리하고 공개할 준비까지 이어집니다.</p></div><div className="mt-12 grid gap-4 md:grid-cols-4">{[{ n: "01", t: "쌓기", d: "Tiro 노트를 모읍니다." }, { n: "02", t: "내 사이트", d: "정리된 기록을 페이지로 만듭니다." }, { n: "03", t: "에이전트화", d: "클로드에게 말로 찾고 관리합니다." }, { n: "04", t: "AI 검색 관리", d: "AI 검색에 잘 노출되게(GEO) 관리합니다." }].map((item) => <article key={item.n} className="rounded-[22px] border border-[#e2d9cf] bg-[#f8f3ec] p-6"><span className="font-mono text-xs font-bold text-[#f25f5c]">{item.n}</span><h3 className="mt-10 font-serif text-2xl">{item.t}</h3><p className="mt-3 text-sm leading-7 text-[#71675d]">{item.d}</p></article>)}</div></div></section>

    <section className="bg-[#f5efe7] px-5 py-20 md:px-10 md:py-28"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold tracking-[0.18em] text-[#9b6d39]">WHY CLIPWISE</p><h2 className="mt-4 max-w-2xl font-serif text-4xl tracking-[-0.05em] md:text-6xl">기록을 남기는 데서<br />다시 쓰는 데까지.</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{benefits.map(({ title, text, icon: Icon, tone }) => <article key={title} className="rounded-[24px] border border-[#e2d6c9] bg-[#fffdfa] p-7"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon className="h-6 w-6" /></div><h3 className="mt-8 font-serif text-2xl">{title}</h3><p className="mt-4 text-sm leading-7 text-[#71675d]">{text}</p><div className="mt-8 h-1 w-14 rounded-full bg-[#e8dfd5]" /></article>)}</div></div></section>

    <section id="cases" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28"><div className="max-w-2xl"><p className="text-xs font-bold tracking-[0.18em] text-[#f25f5c]">HOW PEOPLE USE IT</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] md:text-6xl">이렇게 씁니다.</h2><p className="mt-5 text-sm leading-7 text-[#71675d]">교회, 회사, 개인의 기록은 달라도 다시 찾고 다시 쓰는 경험은 같습니다.</p></div><div className="mt-12 grid gap-6 lg:grid-cols-3">{cases.map(({ label, title, text, quote, accent, icon: Icon }) => <article key={label} className="overflow-hidden rounded-[26px] border border-[#e2d9cf] bg-[#fffdfa]"><div className="p-6"><div className="flex items-center justify-between"><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accent}14`, color: accent }}>{label}</span><Icon className="h-5 w-5" style={{ color: accent }} /></div><h3 className="mt-7 font-serif text-2xl">{title}</h3><p className="mt-3 text-sm leading-7 text-[#71675d]">{text}</p><div className="mt-7"><WebResult accent={accent} title="클로드에게 이렇게 말해요" quote={quote} Icon={Icon} /></div></div></article>)}</div></section>

    <section className="border-y border-[#e9e1d7] bg-[#fffdfa] px-5 py-20 md:px-10 md:py-24"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold tracking-[0.18em] text-[#9b6d39]">QUESTIONS</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] md:text-6xl">처음이라면, 이것부터 확인하세요.</h2><div className="mt-10 grid gap-4 md:grid-cols-2">{homeFaq.map(({ question, answer }) => <article key={question} className="rounded-[22px] border border-[#e2d9cf] bg-[#f8f3ec] p-6"><h3 className="font-serif text-xl">{question}</h3><p className="mt-3 text-sm leading-7 text-[#71675d]">{answer}</p></article>)}</div></div></section>

    <section className="bg-[#f5efe7] px-5 py-16 md:px-10 md:py-20"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-[#9b6d39]">AGENT STATUS</p><h2 className="mt-4 font-serif text-3xl tracking-[-0.04em] md:text-5xl">에이전트 도구 현황</h2></div><p className="max-w-md text-sm leading-7 text-[#71675d]">현재 사용할 수 있는 기능과 준비 중인 기능을 구분해 안내합니다.</p></div><div className="mt-10 grid gap-4 md:grid-cols-2"><article className="rounded-[22px] border border-[#d9e6dc] bg-[#eef7f2] p-6"><span className="text-xs font-bold tracking-[0.14em] text-[#277453]">현재 사용 가능</span><h3 className="mt-4 font-serif text-xl">GEO 점검 · 페이지/FAQ 초안 · 오래된 페이지 점검</h3><p className="mt-2 text-sm leading-6 text-[#5f7467]">Claude에서 공개 페이지의 상태를 확인하고 초안을 만들 수 있습니다. 최종 공개는 승인 후에만 진행됩니다.</p></article><article className="rounded-[22px] border border-[#e3d8c5] bg-[#fff8e9] p-6"><span className="text-xs font-bold tracking-[0.14em] text-[#9b6d39]">준비 중</span><h3 className="mt-4 font-serif text-xl">주 1회 점검 · 이메일 알림</h3><p className="mt-2 text-sm leading-6 text-[#78694f]">주기적인 자동 점검과 Resend 이메일 알림은 준비 중입니다.</p></article></div></div></section>

    <section className="bg-[#2d2925] px-5 py-20 text-white md:px-10 md:py-24"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.85fr_1.15fr] md:items-center"><div><Check className="h-7 w-7 text-[#ffb9b3]" /><h2 className="mt-6 font-serif text-4xl leading-tight tracking-[-0.04em] md:text-5xl">원본은 그대로 보존돼요.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#d8d0c8]">클로드가 만든 결과는 미리보기를 확인하고 승인한 것만 공개돼요. 원본과 정리된 결과를 함께 보면서 안심하고 다음 일을 시작할 수 있습니다.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-[22px] border border-white/15 bg-white/5 p-6"><Upload className="h-5 w-5 text-[#ffb9b3]" /><p className="mt-8 font-serif text-xl">원본 보존</p><p className="mt-2 text-sm leading-6 text-[#bdb4ab]">녹음에서 나온 원문은 그대로 남습니다.</p></div><div className="rounded-[22px] border border-white/15 bg-white/5 p-6"><Check className="h-5 w-5 text-[#ffb9b3]" /><p className="mt-8 font-serif text-xl">승인 후 공개</p><p className="mt-2 text-sm leading-6 text-[#bdb4ab]">검토한 결과만 내 사이트에 공개됩니다.</p></div></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28"><div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><p className="text-xs font-bold tracking-[0.18em] text-[#f25f5c]">START IN THREE STEPS</p><h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] md:text-6xl">오늘의 노트부터<br />정리해 보세요.</h2></div><div className="space-y-5">{[{ n: "01", t: "Tiro 연결", d: "지금 사용하는 Tiro 노트를 가져옵니다. Plaud는 지원 예정입니다." }, { n: "02", t: "클로드 연결", d: "클로드에게 내 노트를 찾고 정리하는 일을 부탁합니다." }, { n: "03", t: "첫 노트 정리", d: "원본 하나를 요약하고, 나만의 사이트에 쌓아 보세요." }].map((step) => <div key={step.n} className="flex gap-5 border-b border-[#e8dfd5] pb-5"><span className="font-mono text-xs font-bold text-[#f25f5c]">{step.n}</span><div><h3 className="font-serif text-xl">{step.t}</h3><p className="mt-1 text-sm leading-6 text-[#71675d]">{step.d}</p></div></div>)}<Link href="/login" className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f25f5c] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#dc4c49]">무료로 시작하기 <ArrowRight className="h-4 w-4" /></Link></div></div></section>

    <Footer />
  </main>;
}
