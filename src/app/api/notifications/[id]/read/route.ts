import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { ok, unauthorized, notFound, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// PATCH /api/notifications/:id/read — 알림 하나 읽음 처리 (본인 것만)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const result = await prisma.notification.updateMany({
      where: { id: params.id, userId },
      data: { readAt: new Date() },
    })
    if (result.count === 0) return notFound('알림을 찾을 수 없습니다.')

    return ok({ id: params.id, read: true }, '읽음 처리했습니다.')
  } catch (e) {
    console.error('[PATCH /notifications/:id/read]', e)
    return serverError()
  }
}
