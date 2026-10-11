import "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
    accessToken?: string;
    provider?: "kakao" | "google";
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    providerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    provider?: "kakao" | "google";
    providerId?: string;
  }
}
