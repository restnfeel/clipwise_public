"use client";
import Link from "next/link";
import { useCwBranding } from "@/components/cw/CwBrandingProvider";
export function Footer() { const branding = useCwBranding(); return <footer className="border-t border-[var(--cw-footer-border)] bg-[var(--cw-footer-bg)] text-[var(--cw-footer-text)]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-8"><div><p className="font-semibold">{branding.brandName}</p><p className="mt-2 text-[var(--cw-footer-muted)]">{branding.tagline}</p></div><nav className="flex gap-4 text-xs text-[var(--cw-footer-muted)]"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></nav></div></footer>; }
