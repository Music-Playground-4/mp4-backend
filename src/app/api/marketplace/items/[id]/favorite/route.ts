import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { ok, created, unauthorized, notFound, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// POST /api/marketplace/items/:id/favorite — 찜 (멱등: 이미 찜했어도 OK)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const item = await prisma.item.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!item) return notFound('상품을 찾을 수 없습니다.')

    await prisma.favorite.upsert({
      where: { userId_itemId: { userId, itemId: params.id } },
      create: { userId, itemId: params.id },
      update: {},
    })

    return created({ itemId: params.id, favorited: true }, '찜했습니다.')
  } catch (e) {
    console.error('[POST /marketplace/items/:id/favorite]', e)
    return serverError()
  }
}

// DELETE /api/marketplace/items/:id/favorite — 찜 해제 (멱등)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    await prisma.favorite.deleteMany({ where: { userId, itemId: params.id } })

    return ok({ itemId: params.id, favorited: false }, '찜을 해제했습니다.')
  } catch (e) {
    console.error('[DELETE /marketplace/items/:id/favorite]', e)
    return serverError()
  }
}
