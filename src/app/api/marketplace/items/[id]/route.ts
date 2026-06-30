import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { updateItemSchema } from '@/lib/validations/marketplace'
import { ok, unauthorized, forbidden, notFound, validationError, noContent, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// GET /api/marketplace/items/:id — 상품 상세
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        seller: { select: { id: true, nickname: true, avatar: true, bio: true, createdAt: true } },
        _count: { select: { favorites: true } },
      },
    })
    if (!item) return notFound('상품을 찾을 수 없습니다.')

    // 조회수 증가 (비동기, 실패해도 무관)
    prisma.item.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    // 로그인 상태면 내 찜 여부
    const userId = await getSessionUserId(req)
    const isFavorited = userId
      ? !!(await prisma.favorite.findUnique({ where: { userId_itemId: { userId, itemId: params.id } }, select: { id: true } }))
      : false

    const { _count, ...rest } = item
    return ok({ ...rest, favCount: _count.favorites, isFavorited })
  } catch (e) {
    console.error('[GET /marketplace/items/:id]', e)
    return serverError()
  }
}

// PUT /api/marketplace/items/:id — 상품 수정 (판매자/관리자)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { sellerId: true } })
    if (!item) return notFound()
    if (item.sellerId !== userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (me?.role !== 'ADMIN') return forbidden()
    }

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

// DELETE /api/marketplace/items/:id — 상품 삭제 (판매자/관리자)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { sellerId: true } })
    if (!item) return notFound()
    if (item.sellerId !== userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (me?.role !== 'ADMIN') return forbidden()
    }

    await prisma.item.delete({ where: { id: params.id } })
    return noContent()
  } catch (e) {
    console.error('[DELETE /marketplace/items/:id]', e)
    return serverError()
  }
}
