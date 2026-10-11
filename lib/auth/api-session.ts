import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getUserIdFromSession } from "@/lib/auth-utils";

/**
 * API Route용 로그인 사용자 확인.
 * 지식관리 기능은 admin 전용이 아니라 본인 데이터 기준으로 동작한다.
 * Dev Bridge 프록시 컨텍스트가 있으면 세션 없이 통과한다.
 */
export async function requireApiUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const userId = await getUserIdFromSession();
  if (!userId) {
    return {
      error: NextResponse.json({ error: "로그인이 필요합니다.", code: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { userId };
}

export function isApiAuthError(
  result: { userId: string } | { error: NextResponse }
): result is { error: NextResponse } {
  return "error" in result;
}
