import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { ok, unauthorized, serverError } from '@/lib/response'

// POST /api/notifications/read-all — 안읽은 알림 전체 읽음 처리
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return ok({ updated: result.count }, '모두 읽음 처리했습니다.')
  } catch (e) {
    console.error('[POST /notifications/read-all]', e)
    return serverError()
  }
}
