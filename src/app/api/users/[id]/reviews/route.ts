import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string } }

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// GET /api/users/:id/reviews — 받은 후기 목록 + 평균
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit
    const where = { revieweeId: params.id }

    const [items, total, agg] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, rating: true, content: true, createdAt: true,
          reviewer: { select: { id: true, nickname: true, avatar: true } },
          item: { select: { id: true, title: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
    ])

    return ok({
      items, total, page, limit, totalPages: Math.ceil(total / limit),
      avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
    })
  } catch (e) {
    console.error('[GET /users/:id/reviews]', e)
    return serverError()
  }
}
