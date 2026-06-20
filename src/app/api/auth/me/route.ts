import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUserId } from '@/lib/auth-token'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

// GET /api/auth/me — Bearer 토큰으로 현재 유저 조회 → user
export async function GET(req: NextRequest) {
  try {
    const userId = await getBearerUserId(req)
    if (!userId) return unauthorized('세션이 만료되었습니다.')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true },
    })
    if (!user) return notFound('사용자를 찾을 수 없습니다.')

    return ok(user)
  } catch (e) {
    console.error('[GET /auth/me]', e)
    return serverError()
  }
}
