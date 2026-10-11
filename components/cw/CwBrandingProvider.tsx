"use client";

import { createContext, useContext, useEffect } from "react";

export type ClientBranding = {
  brandName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  themeDefault: "light" | "dark";
  seoTitle: string;
  seoDescription: string;
  footerText: string;
  contactEmail: string | null;
};

const DEFAULTS: ClientBranding = { brandName: "Clipwise", tagline: "원본을 지식으로 연결하고, 필요한 순간 다시 꺼내 씁니다.", logoUrl: null, faviconUrl: null, primaryColor: "#ff385c", secondaryColor: "#e00b41", themeDefault: "light", seoTitle: "Clipwise - 원본을 AI 지식으로 연결하는 workspace", seoDescription: "원본을 지식화하고 Claude와 연결하는 개인 지식 시스템", footerText: "원본을 지식으로 연결하고, 필요한 순간 다시 꺼내 씁니다.", contactEmail: null };
const Context = createContext<ClientBranding>(DEFAULTS);

export function CwBrandingProvider({ children }: { children: React.ReactNode }) {
  const branding = { ...DEFAULTS, brandName: process.env.NEXT_PUBLIC_BRAND_NAME || DEFAULTS.brandName, logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || null };
  useEffect(() => {
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || DEFAULTS.brandName;
    document.title = brandName;
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--cw-accent", branding.primaryColor);
    document.documentElement.style.setProperty("--cw-accent-active", branding.secondaryColor);
    if (branding.faviconUrl) document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute("href", branding.faviconUrl);
    if (branding.seoTitle) document.title = branding.seoTitle;
  }, [branding]);
  return <Context.Provider value={branding}>{children}</Context.Provider>;
}

export function useCwBranding() { return useContext(Context); }
