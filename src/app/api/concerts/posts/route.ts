import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createConcertPostSchema, concertQuerySchema } from '@/lib/validations/concert'
import { ok, created, unauthorized, validationError, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const parsed = concertQuerySchema.safeParse(Object.fromEntries(searchParams))
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
      prisma.concertPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, title: true, genres: true, instruments: true,
          location: true, venue: true, date: true, pay: true,
          recruitCount: true, createdAt: true,
          author: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.concertPost.count({ where }),
    ])

    return ok({ posts, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = createConcertPostSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const post = await prisma.concertPost.create({
      data: { ...parsed.data, authorId: userId },
    })

    return created(post, '공연 공고가 등록되었습니다.')
  } catch (e) {
    return serverError()
  }
}
