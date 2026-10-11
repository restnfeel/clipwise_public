"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCwBranding } from "@/components/cw/CwBrandingProvider";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { status } = useSession();
  const branding = useCwBranding();
  const isAuthenticated = status === "authenticated";
  const authHref = isAuthenticated ? "/dashboard" : "/login";
  const authLabel = isAuthenticated ? "대시보드" : "로그인";
  const close = () => setOpen(false);
  return <header className="border-b border-[#ebebeb] bg-white px-5 py-5 md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/" onClick={close} className="flex items-center gap-2 text-base font-bold tracking-tight">{branding.logoUrl ? <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ff385c] text-white"><Sparkles className="h-4 w-4" /></span>}{branding.brandName}</Link><nav className="hidden items-center gap-7 text-sm text-[#6a6a6a] md:flex"><a href="#how" className="hover:text-[#222]">작동 방식</a><a href="#cases" className="hover:text-[#222]">활용 사례</a><Link href="/blog" className="hover:text-[#222]">지식</Link><Link href={authHref} className="rounded-lg bg-[#ff385c] px-4 py-2 font-semibold text-white hover:bg-[#e00b41]">{authLabel}</Link></nav><div className="md:hidden"><button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full border border-[#dddddd] text-[#222]">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div></div>{open && <div className="mx-auto mt-5 max-w-7xl border-t border-[#ebebeb] pt-4 md:hidden"><nav className="flex flex-col gap-1 text-sm"><a href="#how" onClick={close} className="rounded-lg px-3 py-3 text-[#3f3f3f] hover:bg-[#f7f7f7]">작동 방식</a><a href="#cases" onClick={close} className="rounded-lg px-3 py-3 text-[#3f3f3f] hover:bg-[#f7f7f7]">활용 사례</a><Link href="/blog" onClick={close} className="rounded-lg px-3 py-3 text-[#3f3f3f] hover:bg-[#f7f7f7]">지식</Link><Link href={authHref} onClick={close} className="mt-2 rounded-lg bg-[#ff385c] px-3 py-3 text-center font-semibold text-white">{authLabel}</Link></nav></div>}</header>;
}
