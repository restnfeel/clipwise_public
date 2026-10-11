import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "http://localhost:54321";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "build-placeholder";

// 서버 개발 시 설정 누락·연결 이슈를 빨리 발견하도록 안내 로그
if (typeof window === "undefined" && process.env.NODE_ENV === "development") {
  if (!supabaseUrl) {
    console.error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL이 비어 있습니다. API에서 fetch failed가 날 수 있습니다."
    );
  } else if (!/^https:\/\/.+\.supabase\.co/.test(supabaseUrl)) {
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL 형식이 일반적인 *.supabase.co 와 다릅니다. 프록시/커스텀 도메인이면 무시하세요."
    );
  }
  if (!supabaseAnonKey) {
    console.error(
      "[Supabase] SUPABASE_ANON_KEY가 비어 있습니다."
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) console.error("[Supabase] SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다.");
}

// 일반 클라이언트용
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버사이드용 (RLS 우회)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "build-placeholder"
);
