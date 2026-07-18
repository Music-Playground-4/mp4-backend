import { describe, it, expect } from 'vitest'
import { createReviewSchema } from './review'

describe('createReviewSchema', () => {
  it('정상 리뷰를 통과시킨다', () => {
    const r = createReviewSchema.safeParse({ revieweeId: 'u1', rating: 5, content: '좋았어요' })
    expect(r.success).toBe(true)
  })

  it('itemId(거래 리뷰)를 포함해도 통과한다', () => {
    expect(createReviewSchema.safeParse({ revieweeId: 'u1', itemId: 'g1', rating: 4 }).success).toBe(true)
  })

  it('rating이 0이면 실패한다', () => {
    expect(createReviewSchema.safeParse({ revieweeId: 'u1', rating: 0 }).success).toBe(false)
  })

  it('rating이 6이면 실패한다', () => {
    expect(createReviewSchema.safeParse({ revieweeId: 'u1', rating: 6 }).success).toBe(false)
  })

  it('revieweeId가 없으면 실패한다', () => {
    expect(createReviewSchema.safeParse({ rating: 5 }).success).toBe(false)
  })
})
