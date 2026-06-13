import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createConcertPostSchema } from '@/lib/validations/concert'
import { ok, unauthorized, forbidden, notFound, validationError, noContent, serverError } from '@/lib/response'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const post = await prisma.concertPost.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, nickname: true, avatar: true, bio: true } },
        _count: { select: { applications: true } },
      },
    })
    if (!post) return notFound('공연 공고를 찾을 수 없습니다.')
    return ok(post)
  } catch (e) {
    return serverError()
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const post = await prisma.concertPost.findUnique({ where: { id: params.id }, select: { authorId: true } })
    if (!post) return notFound()
    if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') return forbidden()

    const body = await req.json()
    const parsed = createConcertPostSchema.partial().safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const updated = await prisma.concertPost.update({ where: { id: params.id }, data: parsed.data })
    return ok(updated)
  } catch (e) {
    return serverError()
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const post = await prisma.concertPost.findUnique({ where: { id: params.id }, select: { authorId: true } })
    if (!post) return notFound()
    if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') return forbidden()

    await prisma.concertPost.delete({ where: { id: params.id } })
    return noContent()
  } catch (e) {
    return serverError()
  }
}
