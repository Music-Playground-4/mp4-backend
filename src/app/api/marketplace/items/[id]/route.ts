import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateItemSchema } from '@/lib/validations/marketplace'
import { ok, unauthorized, forbidden, notFound, validationError, noContent, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET /api/marketplace/items/:id — 상품 상세
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        seller: { select: { id: true, nickname: true, avatar: true, bio: true, createdAt: true } },
        reviews: {
          where: { revieweeId: undefined },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, nickname: true, avatar: true } } },
        },
      },
    })
    if (!item) return notFound('상품을 찾을 수 없습니다.')

    // 조회수 증가 (비동기, 실패해도 무관)
    prisma.item.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    return ok(item)
  } catch (e) {
    console.error('[GET /marketplace/items/:id]', e)
    return serverError()
  }
}

// PUT /api/marketplace/items/:id — 상품 수정
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { sellerId: true } })
    if (!item) return notFound()
    if (item.sellerId !== session.user.id && session.user.role !== 'ADMIN') return forbidden()

    const body = await req.json()
    const parsed = updateItemSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const updated = await prisma.item.update({
      where: { id: params.id },
      data: parsed.data,
      include: { images: true },
    })

    return ok(updated, '상품이 수정되었습니다.')
  } catch (e) {
    console.error('[PUT /marketplace/items/:id]', e)
    return serverError()
  }
}

// DELETE /api/marketplace/items/:id — 상품 삭제
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { sellerId: true } })
    if (!item) return notFound()
    if (item.sellerId !== session.user.id && session.user.role !== 'ADMIN') return forbidden()

    await prisma.item.delete({ where: { id: params.id } })
    return noContent()
  } catch (e) {
    console.error('[DELETE /marketplace/items/:id]', e)
    return serverError()
  }
}
