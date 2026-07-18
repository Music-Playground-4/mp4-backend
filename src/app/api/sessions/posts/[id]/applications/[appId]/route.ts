import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createNotification } from '@/lib/notify'
import { applicationDecisionSchema } from '@/lib/validations/session'
import { ok, unauthorized, forbidden, notFound, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string; appId: string } }

// PATCH /api/sessions/posts/:id/applications/:appId — 지원 수락/거절 (공고 작성자만)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const app = await prisma.sessionApplication.findUnique({
      where: { id: params.appId },
      include: { post: { select: { authorId: true, title: true } } },
    })
    if (!app || app.postId !== params.id) return notFound('지원 내역을 찾을 수 없습니다.')
    if (app.post.authorId !== userId) return forbidden('공고 작성자만 처리할 수 있습니다.')

    const body = await req.json()
    const parsed = applicationDecisionSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const updated = await prisma.sessionApplication.update({
      where: { id: params.appId },
      data: { status: parsed.data.status },
    })

    await createNotification({
      userId: app.userId,
      type: 'SESSION_RESULT',
      title: '지원 결과가 나왔어요',
      body: parsed.data.status === 'ACCEPTED'
        ? `"${app.post.title}" 지원이 수락되었어요!`
        : `"${app.post.title}" 지원이 아쉽게 거절되었어요.`,
      data: { postId: params.id, status: parsed.data.status },
    })

    return ok(updated, '처리되었습니다.')
  } catch (e) {
    console.error('[PATCH /sessions/posts/:id/applications/:appId]', e)
    return serverError()
  }
}
