import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createSessionPostSchema, sessionQuerySchema } from '@/lib/validations/session'
import { ok, created, unauthorized, validationError, serverError } from '@/lib/response'

// GET /api/sessions/posts — 세션 공고 목록
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const parsed = sessionQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { page, limit, genre, instrument, location, q } = parsed.data
    const skip = (page - 1) * limit

    const where = {
      status: 'OPEN' as const,
      ...(genre && { genres: { has: genre } }),
      ...(instrument && { instruments: { has: instrument } }),
      ...(location && { location: { contains: location, mode: 'insensitive' as const } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [posts, total] = await Promise.all([
      prisma.sessionPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          genres: true,
          instruments: true,
          location: true,
          pay: true,
          recruitCount: true,
          deadline: true,
          freq: true,
          level: true,
          createdAt: true,
          author: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.sessionPost.count({ where }),
    ])

    return ok({ posts, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('[GET /sessions/posts]', e)
    return serverError()
  }
}

// POST /api/sessions/posts — 세션 공고 작성
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = createSessionPostSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const post = await prisma.sessionPost.create({
      data: { ...parsed.data, authorId: userId },
    })

    return created(post, '세션 공고가 등록되었습니다.')
  } catch (e) {
    console.error('[POST /sessions/posts]', e)
    return serverError()
  }
}
