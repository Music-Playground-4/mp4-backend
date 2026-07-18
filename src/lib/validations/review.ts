import { z } from 'zod'

export const createReviewSchema = z.object({
  revieweeId: z.string().min(1, '리뷰 대상이 필요합니다.'),
  itemId: z.string().optional(), // 거래 리뷰면 상품 id
  rating: z.number().int().min(1, '평점은 1~5점입니다.').max(5, '평점은 1~5점입니다.'),
  content: z.string().max(1000).optional(),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
