import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createRoomSchema } from '@/lib/validations/chat'
import { ok, created, unauthorized, badRequest, notFound, validationError, serverError } from '@/lib/response'

const memberSelect = { user: { select: { id: true, nickname: true, avatar: true } } }
const roomInclude = {
  members: { select: memberSelect },
  item: { select: { id: true, title: true, price: true, images: { take: 1, select: { url: true } } } },
  sessionPost: { select: { id: true, title: true } },
  concertPost: { select: { id: true, title: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { content: true, type: true, createdAt: true, senderId: true } },
}

// GET /api/chat/rooms — 내가 속한 채팅방 목록
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const memberships = await prisma.chatRoomMember.findMany({
      where: { userId },
      orderBy: { room: { createdAt: 'desc' } },
      select: { lastReadAt: true, room: { include: roomInclude } },
    })

    const rooms = memberships.map((m) => ({ ...m.room, myLastReadAt: m.lastReadAt }))
    return ok(rooms)
  } catch (e) {
    console.error('[GET /chat/rooms]', e)
    return serverError()
  }
}

// POST /api/chat/rooms — 방 생성(또는 기존 방 반환) + 나를 멤버로 합류
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = createRoomSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { type, sellerId, itemId, sessionPostId, concertPostId } = parsed.data

    if (type === 'MARKET') {
      if (!sellerId) return badRequest('판매자 정보가 필요합니다.')
      if (sellerId === userId) return badRequest('본인과는 채팅할 수 없습니다.')

      // 같은 상품·두 사람의 기존 1:1 방 찾기
      const existing = await prisma.chatRoom.findFirst({
        where: {
          type: 'MARKET',
          itemId: itemId ?? null,
          AND: [{ members: { some: { userId } } }, { members: { some: { userId: sellerId } } }],
        },
        include: roomInclude,
      })
      if (existing) return ok(existing)

      const room = await prisma.chatRoom.create({
        data: { type: 'MARKET', itemId, members: { create: [{ userId }, { userId: sellerId }] } },
        include: roomInclude,
      })
      return created(room)
    }

    // SESSION / CONCERT — 공고당 그룹방 하나. 진입자는 멤버로 합류.
    const postKey = type === 'SESSION' ? 'sessionPostId' : 'concertPostId'
    const postId = type === 'SESSION' ? sessionPostId : concertPostId
    if (!postId) return badRequest('공고 정보가 필요합니다.')

    const post =
      type === 'SESSION'
        ? await prisma.sessionPost.findUnique({ where: { id: postId }, select: { id: true } })
        : await prisma.concertPost.findUnique({ where: { id: postId }, select: { id: true } })
    if (!post) return notFound('공고를 찾을 수 없습니다.')

    let room = await prisma.chatRoom.findFirst({ where: { type, [postKey]: postId }, select: { id: true } })
    if (!room) {
      room = await prisma.chatRoom.create({ data: { type, [postKey]: postId }, select: { id: true } })
    }

    // 멤버 합류 (멱등)
    await prisma.chatRoomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      create: { roomId: room.id, userId },
      update: {},
    })

    const full = await prisma.chatRoom.findUnique({ where: { id: room.id }, include: roomInclude })
    return created(full)
  } catch (e) {
    console.error('[POST /chat/rooms]', e)
    return serverError()
  }
}
