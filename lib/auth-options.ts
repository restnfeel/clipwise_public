import { type NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";
import { GOOGLE_LOGIN_ENABLED } from "@/lib/auth-features";
import { databaseSetupRedirectUrl, getDatabaseSetupStatus } from "@/lib/setup/database-status";

const kakaoEnabled = Boolean(process.env.KAKAO_CLIENT_ID?.trim() && process.env.KAKAO_CLIENT_SECRET?.trim());
const allowedEmails = new Set((process.env.ALLOWED_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));

export const authOptions: NextAuthOptions = {
  providers: [
    ...(GOOGLE_LOGIN_ENABLED ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || "", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "", authorization: { params: { scope: "openid email profile" } } })] : []),
    ...(kakaoEnabled ? [KakaoProvider({ clientId: process.env.KAKAO_CLIENT_ID || "", clientSecret: process.env.KAKAO_CLIENT_SECRET || "", authorization: { params: { scope: "profile_nickname account_email" } } })] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || (allowedEmails.size > 0 && !allowedEmails.has(email))) return false;
      const setup = await getDatabaseSetupStatus().catch(() => ({ ready: false, missing: [], unavailable: true }));
      if (setup.missing.length > 0) return databaseSetupRedirectUrl();
      const providerColumn = account?.provider === "google" ? "google_id" : "kakao_id";
      const providerId = user.id;
      const { data: existing } = await supabaseAdmin.from("users").select("id,status").eq(providerColumn, providerId).maybeSingle();
      if (existing?.status === "deleted") return false;
      if (existing?.id) {
        await supabaseAdmin.from("users").update({ email, name: user.name, profile_image: user.image, updated_at: new Date().toISOString() }).eq("id", existing.id);
        return true;
      }
      const { data: byEmail } = await supabaseAdmin.from("users").select("id,status").eq("email", email).maybeSingle();
      if (byEmail?.status === "deleted") return false;
      if (byEmail?.id) {
        await supabaseAdmin.from("users").update({ [providerColumn]: providerId, name: user.name, profile_image: user.image, updated_at: new Date().toISOString() }).eq("id", byEmail.id);
        return true;
      }
      const { error } = await supabaseAdmin.from("users").insert({ [providerColumn]: providerId, email, name: user.name, profile_image: user.image, status: "active" });
      if (error) console.error("[auth] 사용자 생성 실패", error.code);
      return !error;
    },
    async jwt({ token, user, account }) {
      if (account && user && (account.provider === "google" || account.provider === "kakao")) { token.provider = account.provider; token.providerId = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.providerId || token.sub || "");
      session.provider = token.provider === "google" || token.provider === "kakao" ? token.provider : undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: { signIn: "/login", error: "/" },
  session: { strategy: "jwt" },
};
