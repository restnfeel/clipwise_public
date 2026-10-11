import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase";

type SessionProvider = { provider?: string };

function isMissingYoutubeChannelColumn(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("youtube_channel_id") &&
    (msg.includes("schema cache") ||
      msg.includes("could not find") ||
      msg.includes("does not exist") ||
      error.code === "PGRST204" ||
      error.code === "42703")
  );
}

async function findUserRow(sessionUserId: string, provider: string) {
  let query = supabaseAdmin.from("users").select("*");
  if (provider === "google") {
    query = query.eq("google_id", sessionUserId);
  } else {
    query = query.eq("kakao_id", sessionUserId);
  }
  return query.single();
}

/** users.youtube_channel_id 없을 때 채널 캐시 테이블에서 최근 채널 조회 */
async function loadChannelIdFallback(userUuid: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("youtube_channels")
    .select("channel_id, handle, updated_at")
    .eq("user_id", userUuid)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data.channel_id || data.handle || null) as string | null;
}

/** users 컬럼 없이 채널 선호값 저장 */
async function saveChannelIdFallback(
  userUuid: string,
  channelId: string
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin.from("youtube_channels").upsert(
    {
      user_id: userUuid,
      channel_id: channelId,
      updated_at: nowIso,
      last_synced_at: nowIso,
    },
    { onConflict: "user_id,channel_id" }
  );

  if (error) {
    console.error("[profile] youtube_channels 폴백 저장 실패:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const sessionUserId = session.user.id;
    const provider = (session as SessionProvider).provider || "kakao";

    const { data: user, error } = await findUserRow(sessionUserId, provider);

    if (error || !user) {
      console.error("프로필 조회 오류:", error);
      return NextResponse.json({ error: "프로필 조회 실패" }, { status: 500 });
    }

    let youtubeChannelId: string | null = null;
    if (
      Object.prototype.hasOwnProperty.call(user, "youtube_channel_id") &&
      (user as { youtube_channel_id?: string | null }).youtube_channel_id
    ) {
      youtubeChannelId = (
        user as { youtube_channel_id?: string | null }
      ).youtube_channel_id!;
    } else {
      youtubeChannelId = await loadChannelIdFallback(user.id);
    }

    return NextResponse.json({
      user: {
        ...user,
        youtube_channel_id: youtubeChannelId,
      },
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, youtube_channel_id } = body;

    const updateData: {
      name?: string;
      youtube_channel_id?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { error: "이름은 필수입니다." },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    const wantsChannelUpdate = youtube_channel_id !== undefined;
    if (wantsChannelUpdate) {
      updateData.youtube_channel_id = youtube_channel_id || null;
    }

    const sessionUserId = session.user.id;
    const provider = (session as SessionProvider).provider || "kakao";

    const { data: existingUser, error: findError } = await findUserRow(
      sessionUserId,
      provider
    );
    if (findError || !existingUser?.id) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const runUpdate = async (payload: Record<string, unknown>) => {
      let q = supabaseAdmin.from("users").update(payload);
      if (provider === "google") {
        q = q.eq("google_id", sessionUserId);
      } else {
        q = q.eq("kakao_id", sessionUserId);
      }
      return q.select("*").single();
    };

    let { data, error } = await runUpdate(updateData);
    let savedChannelId: string | null =
      wantsChannelUpdate ? youtube_channel_id || null : null;

    if (error && isMissingYoutubeChannelColumn(error) && wantsChannelUpdate) {
      console.warn(
        "[profile] users.youtube_channel_id 없음 → youtube_channels 폴백 저장"
      );

      const withoutChannel: Record<string, unknown> = {
        updated_at: updateData.updated_at,
      };
      if (updateData.name !== undefined) {
        withoutChannel.name = updateData.name;
      }

      if (updateData.name !== undefined) {
        const retry = await runUpdate(withoutChannel);
        data = retry.data;
        error = retry.error;
      } else {
        error = null;
        data = existingUser;
      }

      if (youtube_channel_id) {
        const fallback = await saveChannelIdFallback(
          existingUser.id,
          String(youtube_channel_id).trim()
        );
        if (!fallback.ok) {
          // 브라우저 폴백은 클라이언트가 처리. 서버는 성공으로 응답해 UX를 막지 않음.
          console.error("[profile] 채널 폴백 저장 실패(클라이언트 로컬 유지):", fallback.error);
        }
        savedChannelId = String(youtube_channel_id).trim();
      } else {
        savedChannelId = null;
      }
    }

    if (error) {
      console.error("프로필 업데이트 오류:", error);
      return NextResponse.json(
        {
          error: `프로필 업데이트 실패: ${error.message || JSON.stringify(error)}`,
        },
        { status: 500 }
      );
    }

    if (!wantsChannelUpdate) {
      savedChannelId =
        (data as { youtube_channel_id?: string | null } | null)
          ?.youtube_channel_id ??
        (await loadChannelIdFallback(existingUser.id));
    }

    return NextResponse.json({
      user: {
        ...data,
        youtube_channel_id: savedChannelId,
      },
    });
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
