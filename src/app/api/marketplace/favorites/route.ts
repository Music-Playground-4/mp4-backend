import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { ok, unauthorized, validationError, serverError } from '@/lib/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// GET /api/marketplace/favorites — 내가 찜한 상품 목록
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          createdAt: true,
          item: {
            select: {
              id: true, title: true, price: true, category: true, grade: true, status: true,
              seller: { select: { id: true, nickname: true, avatar: true } },
              images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId } }),
    ])

    const items = favorites.map((f) => ({ ...f.item, favoritedAt: f.createdAt }))
    return ok({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('[GET /marketplace/favorites]', e)
    return serverError()
  }
}
