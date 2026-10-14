import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { SetupSqlCopy } from "@/components/setup/SetupSqlCopy";
import { getDatabaseSetupStatus } from "@/lib/setup/database-status";

const SQL_PATH = path.join(process.cwd(), "public/onboarding/sql/0001_clipwise_public_init.sql");

export default async function SetupPage() {
  let sql = "";
  try { sql = await readFile(SQL_PATH, "utf8"); } catch { sql = "초기화 SQL 파일을 찾을 수 없습니다. 저장소의 public/onboarding/sql/0001_clipwise_public_init.sql 파일을 확인하세요."; }
  const status = await getDatabaseSetupStatus().catch(() => ({ ready: false, missing: [], unavailable: true }));
  return <main className="min-h-screen bg-[var(--cw-paper)] px-5 py-10 text-[var(--cw-ink)] md:px-10 md:py-16"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between gap-4"><Link href="/" className="text-lg font-bold tracking-[0.12em]">CLIPWISE</Link><Link href="/login" className="text-sm font-semibold text-[var(--cw-accent)]">로그인으로 돌아가기</Link></div><section className="mt-12 border border-[var(--cw-border)] bg-[var(--cw-panel)] p-6 md:p-10"><p className="text-xs font-bold tracking-[0.22em] text-[var(--cw-accent)]">FIRST DATABASE SETUP</p><h1 className="mt-4 font-serif text-4xl">Supabase 초기 테이블 만들기</h1><p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--cw-body)]">새 Supabase 프로젝트에서는 먼저 아래 초기화 SQL을 한 번 실행해야 Google 로그인과 개인 workspace가 동작합니다. 이 화면은 SQL을 자동 실행하지 않으며, 운영자가 Supabase SQL Editor에서 내용을 확인한 뒤 직접 실행합니다.</p>{status.missing.length > 0 ? <p className="mt-5 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">아직 준비되지 않은 테이블 {status.missing.length}개를 확인했습니다.</p> : status.ready ? <p className="mt-5 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">필수 테이블이 모두 확인되었습니다. 로그인을 진행해 주세요.</p> : null}<ol className="mt-8 grid gap-4 text-sm leading-7 text-[var(--cw-body)] md:grid-cols-3"><li className="border border-[var(--cw-border)] bg-[var(--cw-paper)] p-4"><b className="text-[var(--cw-ink)]">1. 복사</b><br />아래 SQL 전체 복사 버튼을 누릅니다.</li><li className="border border-[var(--cw-border)] bg-[var(--cw-paper)] p-4"><b className="text-[var(--cw-ink)]">2. 실행</b><br />Supabase Dashboard의 SQL Editor에 붙여 넣고 실행합니다.</li><li className="border border-[var(--cw-border)] bg-[var(--cw-paper)] p-4"><b className="text-[var(--cw-ink)]">3. 확인</b><br />완료 후 로그인 화면으로 돌아가 Google 로그인을 다시 시도합니다.</li></ol><p className="mt-6 border-l-2 border-[var(--cw-accent)] pl-4 text-xs leading-6 text-[var(--cw-muted)]">SQL은 <code>create table if not exists</code>를 사용하도록 작성되어 있어 초기 빈 DB에서 실행하는 용도입니다. 실행 전 Supabase 프로젝트와 대상 환경이 맞는지 확인하세요.</p><SetupSqlCopy sql={sql} /></section></div></main>;
}
