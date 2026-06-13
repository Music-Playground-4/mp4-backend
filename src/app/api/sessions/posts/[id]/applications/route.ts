import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionApplicationSchema } from '@/lib/validations/session'
import { ok, created, unauthorized, forbidden, notFound, conflict, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET — 지원자 목록 (공고 작성자만)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const post = await prisma.sessionPost.findUnique({ where: { id: params.id }, select: { authorId: true } })
    if (!post) return notFound()
    if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') return forbidden()

    const applications = await prisma.sessionApplication.findMany({
      where: { postId: params.id },
      include: { user: { select: { id: true, nickname: true, avatar: true, bio: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return ok(applications)
  } catch (e) {
    return serverError()
  }
}

// POST — 세션 지원
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const post = await prisma.sessionPost.findUnique({ where: { id: params.id }, select: { authorId: true, status: true } })
    if (!post) return notFound('세션 공고를 찾을 수 없습니다.')
    if (post.status !== 'OPEN') return conflict('마감된 공고입니다.')
    if (post.authorId === session.user.id) return forbidden('본인 공고에는 지원할 수 없습니다.')

    const existing = await prisma.sessionApplication.findUnique({
      where: { postId_userId: { postId: params.id, userId: session.user.id } },
    })
    if (existing) return conflict('이미 지원한 공고입니다.')

    const body = await req.json()
    const parsed = sessionApplicationSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const application = await prisma.sessionApplication.create({
      data: { postId: params.id, userId: session.user.id, ...parsed.data },
    })

    return created(application, '지원이 완료되었습니다.')
  } catch (e) {
    return serverError()
  }
}
