import { z } from 'zod'

export const createConcertPostSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(5000),
  genres: z.array(z.string()).min(1),
  instruments: z.array(z.string()).min(1),
  location: z.string().min(1).max(100),
  venue: z.string().max(100).optional(),
  date: z.string().datetime().optional(),
  pay: z.string().max(100).optional(),
  recruitCount: z.number().int().min(1).max(50).default(1),
})

export const concertApplicationSchema = z.object({
  message: z.string().max(1000).optional(),
  portfolio: z.string().max(500).optional(),
})

export const concertQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  genre: z.string().optional(),
  instrument: z.string().optional(),
  location: z.string().optional(),
  q: z.string().max(100).optional(),
})

export type CreateConcertPostInput = z.infer<typeof createConcertPostSchema>
export type ConcertApplicationInput = z.infer<typeof concertApplicationSchema>
