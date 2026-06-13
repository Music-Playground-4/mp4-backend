import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, created, unauthorized, badRequest, conflict, serverError } from '@/lib/response'
import { z } from 'zod'

const createRoomSchema = z.object({
  sellerId: z.string().cuid(),
  itemId: z.string().cuid().optional(),
})

// GET — 내 채팅방 목록
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
      },
      include: {
        buyer: { select: { id: true, nickname: true, avatar: true } },
        seller: { select: { id: true, nickname: true, avatar: true } },
        item: { select: { id: true, title: true, price: true, images: { take: 1, select: { url: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, type: true, createdAt: true, readAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(rooms)
  } catch (e) {
    return serverError()
  }
}

// POST — 채팅방 생성 (또는 기존 방 반환)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = createRoomSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다.')

    const { sellerId, itemId } = parsed.data

    if (sellerId === session.user.id) return badRequest('본인과는 채팅할 수 없습니다.')

    // 기존 방 찾기
    const existing = await prisma.chatRoom.findFirst({
      where: { buyerId: session.user.id, sellerId, ...(itemId ? { itemId } : {}) },
    })
    if (existing) return ok(existing)

    const room = await prisma.chatRoom.create({
      data: { buyerId: session.user.id, sellerId, itemId },
      include: {
        buyer: { select: { id: true, nickname: true, avatar: true } },
        seller: { select: { id: true, nickname: true, avatar: true } },
        item: { select: { id: true, title: true, price: true } },
      },
    })

    return created(room)
  } catch (e) {
    return serverError()
  }
}
