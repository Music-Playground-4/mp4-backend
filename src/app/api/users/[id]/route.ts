import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response'
import { z } from 'zod'

type Params = { params: { id: string } }

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(30).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
})

// GET /api/users/:id — 공개 프로필
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, nickname: true, avatar: true, bio: true, createdAt: true,
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
    return serverError()
  }
}

// PUT /api/users/:id — 프로필 수정 (본인만)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    if (session.user.id !== params.id) return forbidden()

    const body = await req.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다.')

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, nickname: true, avatar: true, bio: true, phone: true },
    })

    return ok(updated, '프로필이 업데이트되었습니다.')
  } catch (e) {
    return serverError()
  }
}
