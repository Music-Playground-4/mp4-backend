import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { updateProfileSchema } from '@/lib/validations/user'
import { ok, unauthorized, validationError, serverError } from '@/lib/response'

// GET /api/users — 내 프로필 조회 (Bearer 토큰 또는 쿠키 세션)
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, nickname: true, avatar: true, bio: true, phone: true,
        position: true, region: true, genres: true, level: true, activityTypes: true,
        phoneVerified: true, role: true, createdAt: true,
        _count: {
          select: { items: true, sessionPosts: true, concertPosts: true, reviewsReceived: true },
        },
      },
    })

    return ok(user)
  } catch (e) {
    console.error('[GET /users]', e)
    return serverError()
  }
}

// PATCH /api/users — 내 프로필/온보딩 수정
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true, nickname: true, avatar: true, bio: true, phone: true,
        position: true, region: true, genres: true, level: true, activityTypes: true,
      },
    })

    return ok(updated, '프로필이 업데이트되었습니다.')
  } catch (e) {
    console.error('[PATCH /users]', e)
    return serverError()
  }
}
