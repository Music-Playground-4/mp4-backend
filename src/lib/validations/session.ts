import { z } from 'zod'
import { Frequency, RecruitLevel } from '@prisma/client'

export const createSessionPostSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  genres: z.array(z.string()).min(1, '장르를 1개 이상 선택해주세요.'),
  instruments: z.array(z.string()).min(1, '구하는 악기를 선택해주세요.'),
  location: z.string().min(1).max(100),
  pay: z.string().max(100).optional(),
  recruitCount: z.number().int().min(1).max(20).default(1),
  deadline: z.string().datetime().optional(),
  freq: z.nativeEnum(Frequency).optional(),
  level: z.nativeEnum(RecruitLevel).optional(),
})

// 지원 수락/거절
export const applicationDecisionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
})

export const sessionApplicationSchema = z.object({
  message: z.string().max(1000).optional(),
  portfolio: z.string().max(500).optional(),
})

export const sessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  genre: z.string().optional(),
  instrument: z.string().optional(),
  location: z.string().optional(),
  q: z.string().max(100).optional(),
})

export type CreateSessionPostInput = z.infer<typeof createSessionPostSchema>
export type SessionApplicationInput = z.infer<typeof sessionApplicationSchema>
