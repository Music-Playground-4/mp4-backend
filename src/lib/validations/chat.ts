import { z } from 'zod'
import { ChatRoomType } from '@prisma/client'

// 채팅방 생성/조회 — type별 대상이 다르다
export const createRoomSchema = z.object({
  type: z.nativeEnum(ChatRoomType),
  sellerId: z.string().cuid().optional(), // MARKET 상대
  itemId: z.string().cuid().optional(), // MARKET 상품
  sessionPostId: z.string().cuid().optional(), // SESSION 공고
  concertPostId: z.string().cuid().optional(), // CONCERT 공고
})

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  type: z.enum(['TEXT', 'IMAGE']).default('TEXT'),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
