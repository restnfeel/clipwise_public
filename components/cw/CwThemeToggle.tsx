"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function CwThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("cw-theme");
    const nextDark = stored === "dark";
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => setDark(nextDark));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    document.documentElement.dataset.theme = nextDark ? "dark" : "light";
    window.localStorage.setItem("cw-theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 items-center gap-2 border border-[var(--cw-border)] px-2.5 text-xs font-semibold text-[var(--cw-muted)] transition hover:border-[var(--cw-accent)] hover:text-[var(--cw-accent)]"
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={dark ? "라이트 모드" : "다크 모드"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{dark ? "라이트" : "다크"}</span>
    </button>
  );
}
