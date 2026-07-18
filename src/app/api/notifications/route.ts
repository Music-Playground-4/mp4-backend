import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { ok, unauthorized, validationError, serverError } from '@/lib/response'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// GET /api/notifications — 내 알림 목록 (+ 안읽음 수)
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ])

    return ok({ items, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount })
  } catch (e) {
    console.error('[GET /notifications]', e)
    return serverError()
  }
}
