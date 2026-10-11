import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 세션에서 사용자 ID를 가져와 Supabase의 UUID를 반환합니다.
 * Dev Bridge 컨텍스트가 있으면 세션 대신 브리지 사용자 UUID를 반환합니다.
 * @returns 사용자 UUID 또는 null
 */
export async function getUserIdFromSession(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;
  const provider = session.provider || "google";
  
  let query = supabaseAdmin
    .from("users")
    .select("id");
  
  if (provider === "google") {
    query = query.eq("google_id", userId);
  } else {
    query = query.eq("kakao_id", userId);
  }
  
  const { data: user } = await query.single();

  return user?.id || null;
}

/**
 * 세션 객체가 유효한지 확인하고 사용자 UUID를 반환합니다.
 */
export async function validateSession(): Promise<{
  isValid: boolean;
  userId: string | null;
  session: Awaited<ReturnType<typeof getServerSession>>;
}> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return { isValid: false, userId: null, session: null };
  }

  const userId = await getUserIdFromSession();

  return {
    isValid: !!userId,
    userId,
    session,
  };
}

