import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, created, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response'
import { z } from 'zod'

type Params = { params: { id: string } }

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(['TEXT', 'IMAGE']).default('TEXT'),
})

// GET — 메시지 목록 (cursor 기반 페이지네이션)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.id },
      select: { buyerId: true, sellerId: true },
    })
    if (!room) return notFound()
    if (room.buyerId !== session.user.id && room.sellerId !== session.user.id) return forbidden()

    const cursor = req.nextUrl.searchParams.get('cursor')
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 30), 50)

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, nickname: true, avatar: true } } },
    })

    // 안읽은 메시지 읽음 처리
    await prisma.chatMessage.updateMany({
      where: { roomId: params.id, senderId: { not: session.user.id }, readAt: null },
      data: { readAt: new Date() },
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null
    return ok({ messages: messages.reverse(), nextCursor })
  } catch (e) {
    return serverError()
  }
}

// POST — 메시지 전송
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.id },
      select: { buyerId: true, sellerId: true },
    })
    if (!room) return notFound()
    if (room.buyerId !== session.user.id && room.sellerId !== session.user.id) return forbidden()

    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) return badRequest('메시지 내용을 확인해주세요.')

    const message = await prisma.chatMessage.create({
      data: { roomId: params.id, senderId: session.user.id, ...parsed.data },
      include: { sender: { select: { id: true, nickname: true, avatar: true } } },
    })

    return created(message)
  } catch (e) {
    return serverError()
  }
}
