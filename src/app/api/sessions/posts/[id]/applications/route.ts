import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createNotification } from '@/lib/notify'
import { sessionApplicationSchema } from '@/lib/validations/session'
import { ok, created, unauthorized, forbidden, notFound, conflict, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET — 지원자 목록 (공고 작성자만)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const post = await prisma.sessionPost.findUnique({ where: { id: params.id }, select: { authorId: true } })
    if (!post) return notFound()
    if (post.authorId !== userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (me?.role !== 'ADMIN') return forbidden()
    }

    const applications = await prisma.sessionApplication.findMany({
      where: { postId: params.id },
      include: { user: { select: { id: true, nickname: true, avatar: true, bio: true, position: true, region: true, level: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return ok(applications)
  } catch (e) {
    console.error('[GET /sessions/posts/:id/applications]', e)
    return serverError()
  }
}

// POST — 세션 지원 (지원 시 작성자에게 알림)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const post = await prisma.sessionPost.findUnique({ where: { id: params.id }, select: { authorId: true, status: true, title: true } })
    if (!post) return notFound('세션 공고를 찾을 수 없습니다.')
    if (post.status !== 'OPEN') return conflict('마감된 공고입니다.')
    if (post.authorId === userId) return forbidden('본인 공고에는 지원할 수 없습니다.')

    const existing = await prisma.sessionApplication.findUnique({
      where: { postId_userId: { postId: params.id, userId } },
      select: { id: true },
    })
    if (existing) return conflict('이미 지원한 공고입니다.')

    const body = await req.json()
    const parsed = sessionApplicationSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const application = await prisma.sessionApplication.create({
      data: { postId: params.id, userId, ...parsed.data },
    })

    await createNotification({
      userId: post.authorId,
      type: 'SESSION_APPLY',
      title: '새 지원자가 있어요',
      body: `"${post.title}" 공고에 지원이 도착했어요.`,
      data: { postId: params.id, applicationId: application.id },
    })

    return created(application, '지원이 완료되었습니다.')
  } catch (e) {
    console.error('[POST /sessions/posts/:id/applications]', e)
    return serverError()
  }
}
