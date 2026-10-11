"use client";

import { SessionProvider } from "next-auth/react";
import { NoticeLayer } from "@/components/ui/NoticeLayer";
import { CwBrandingProvider } from "@/components/cw/CwBrandingProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CwBrandingProvider>
        {children}
        <NoticeLayer />
      </CwBrandingProvider>
    </SessionProvider>
  );
}
