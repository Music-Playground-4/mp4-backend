import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTrust } from '@/lib/trust'
import { ok, notFound, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET /api/users/:id/trust — 신뢰점수 (점수·등급·내역)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { phoneVerified: true, position: true, region: true, bio: true, avatar: true, genres: true },
    })
    if (!user) return notFound('사용자를 찾을 수 없습니다.')

    const [agg, soldCount, demoCount] = await Promise.all([
      prisma.review.aggregate({ where: { revieweeId: params.id }, _avg: { rating: true }, _count: true }),
      prisma.item.count({ where: { sellerId: params.id, status: 'SOLD' } }),
      prisma.item.count({ where: { sellerId: params.id, demoUrl: { not: null } } }),
    ])

    const trust = calculateTrust({
      phoneVerified: user.phoneVerified,
      profileComplete: Boolean(user.position && user.region && user.bio && user.avatar && user.genres.length > 0),
      avgRating: agg._avg.rating,
      reviewCount: agg._count,
      soldCount,
      hasDemo: demoCount > 0,
    })

    return ok(trust)
  } catch (e) {
    console.error('[GET /users/:id/trust]', e)
    return serverError()
  }
}
