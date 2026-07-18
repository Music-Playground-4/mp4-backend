import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { sendMessageSchema } from '@/lib/validations/chat'
import { ok, created, unauthorized, forbidden, validationError, serverError } from '@/lib/response'

type Params = { params: { id: string } }

// 방 멤버 여부 확인 헬퍼
async function getMembership(roomId: string, userId: string) {
  return prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { id: true },
  })
}

// GET — 메시지 목록 (cursor 페이지네이션) + 내 lastReadAt 갱신
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const membership = await getMembership(params.id, userId)
    if (!membership) return forbidden()

    const cursor = req.nextUrl.searchParams.get('cursor')
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 30), 50)

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, nickname: true, avatar: true } } },
    })

    // 내 읽음 위치 갱신
    await prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId: params.id, userId } },
      data: { lastReadAt: new Date() },
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null
    return ok({ messages: messages.reverse(), nextCursor })
  } catch (e) {
    console.error('[GET /chat/rooms/:id/messages]', e)
    return serverError()
  }
}

// POST — 메시지 전송 (멤버만)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const membership = await getMembership(params.id, userId)
    if (!membership) return forbidden()

    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const message = await prisma.chatMessage.create({
      data: { roomId: params.id, senderId: userId, ...parsed.data },
      include: { sender: { select: { id: true, nickname: true, avatar: true } } },
    })

    return created(message)
  } catch (e) {
    console.error('[POST /chat/rooms/:id/messages]', e)
    return serverError()
  }
}
