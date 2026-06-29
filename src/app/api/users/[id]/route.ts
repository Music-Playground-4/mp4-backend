import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { updateProfileSchema } from '@/lib/validations/user'
import { ok, unauthorized, forbidden, notFound, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET /api/users/:id — 공개 프로필 (민감정보 제외)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, nickname: true, avatar: true, bio: true, createdAt: true,
        position: true, region: true, genres: true, level: true,
        items: {
          where: { status: 'AVAILABLE' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, price: true, images: { take: 1, select: { url: true } } },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { rating: true, content: true, createdAt: true, reviewer: { select: { id: true, nickname: true, avatar: true } } },
        },
        _count: { select: { items: true, reviewsReceived: true } },
      },
    })
    if (!user) return notFound('사용자를 찾을 수 없습니다.')
    return ok(user)
  } catch (e) {
    console.error('[GET /users/[id]]', e)
    return serverError()
  }
}

// PUT /api/users/:id — 프로필 수정 (본인만)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()
    if (userId !== params.id) return forbidden()

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true, nickname: true, avatar: true, bio: true, phone: true,
        position: true, region: true, genres: true, level: true, activityTypes: true,
      },
    })

    return ok(updated, '프로필이 업데이트되었습니다.')
  } catch (e) {
    console.error('[PUT /users/[id]]', e)
    return serverError()
  }
}
