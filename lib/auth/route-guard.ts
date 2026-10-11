// 라우팅 가드 헬퍼 함수

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

/**
 * 사용자 유형 확인 (app_role 우선, user_type/role fallback — 사이드바 메뉴와 동일 기준)
 */
/**
 * 인증 필요 가드
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return session;
}

/**
 * 특정 사용자 유형 필요 가드
 */
