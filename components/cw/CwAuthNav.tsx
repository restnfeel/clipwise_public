"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const ITEM_CLASS = "flex w-full items-center gap-3 px-4 py-3 text-sm transition text-[var(--cw-muted)] hover:text-[var(--cw-accent)]";

export function CwAuthNav() {
  const { status } = useSession();

  if (status === "loading") {
    return <span className="block h-8 w-20 animate-pulse border border-[var(--cw-border)] bg-[var(--cw-panel)]" aria-hidden="true" />;
  }

  if (status === "authenticated") {
    return (
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={ITEM_CLASS}>
        <LogOut className="h-4 w-4" /> 로그아웃
      </button>
    );
  }

  return (
    <Link href="/login?callbackUrl=%2Fdashboard" className={ITEM_CLASS}>
      <LogIn className="h-4 w-4" /> 로그인
    </Link>
  );
}
