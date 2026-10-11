import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // session.user.id는 provider에 따라 kakao_id 또는 google_id
    const userId = session.user.id;
    const provider = session.provider || "google";

    // 사용자 정보 조회
    let query = supabaseAdmin
      .from("users")
      .select("id, name, email");

    if (provider === "google") {
      query = query.eq("google_id", userId);
    } else {
      query = query.eq("kakao_id", userId);
    }

    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      console.error("사용자 조회 오류:", userError);
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 탈퇴 히스토리 저장
    const { error: historyError } = await supabaseAdmin
      .from("user_withdrawal_history")
      .insert({
        user_id: user.id,
        name: user.name,
        email: user.email,
        withdrawn_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error("탈퇴 히스토리 저장 오류:", historyError);
      return NextResponse.json(
        { error: "탈퇴 히스토리 저장 실패" },
        { status: 500 }
      );
    }

    // users 테이블의 status를 'deleted'로 업데이트
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("사용자 상태 업데이트 오류:", updateError);
      return NextResponse.json(
        { error: "사용자 상태 업데이트 실패" },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("cw_mcp_access_keys").update({ revoked_at: new Date().toISOString() }).eq("user_id", user.id).is("revoked_at", null);
    await supabaseAdmin.from("cw_mcp_sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", user.id).is("revoked_at", null);

    return NextResponse.json({ success: true, message: "탈퇴가 완료되었습니다." });
  } catch (error) {
    console.error("탈퇴 처리 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

