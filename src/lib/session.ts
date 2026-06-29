import type { NextRequest } from 'next/server'
import { auth } from './auth'
import { getBearerUserId } from './auth-token'

// 통합 인증 헬퍼.
// 이메일/비밀번호 로그인(Bearer JWT)을 먼저 확인하고, 없으면 NextAuth 쿠키 세션을 본다.
// 둘 중 하나라도 유효하면 userId를 반환한다. (프론트는 Bearer, 웹 OAuth는 쿠키)
export async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const bearerUserId = await getBearerUserId(req)
  if (bearerUserId) return bearerUserId

  const session = await auth()
  return session?.user?.id ?? null
}
