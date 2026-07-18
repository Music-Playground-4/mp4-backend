import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/session'
import { createNotification } from '@/lib/notify'
import { createReviewSchema } from '@/lib/validations/review'
import { created, badRequest, unauthorized, notFound, conflict, validationError, serverError } from '@/lib/response'

// POST /api/reviews — 후기 작성
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req)
    if (!userId) return unauthorized()

    const body = await req.json()
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { revieweeId, itemId, rating, content } = parsed.data
    if (revieweeId === userId) return badRequest('자기 자신은 리뷰할 수 없습니다.')

    const reviewee = await prisma.user.findUnique({ where: { id: revieweeId }, select: { id: true } })
    if (!reviewee) return notFound('대상 사용자를 찾을 수 없습니다.')

    // 같은 대상+상품 조합 중복 방지
    const dup = await prisma.review.findFirst({
      where: { reviewerId: userId, revieweeId, itemId: itemId ?? null },
      select: { id: true },
    })
    if (dup) return conflict('이미 작성한 후기입니다.')

    const review = await prisma.review.create({
      data: { reviewerId: userId, revieweeId, rating, content, ...(itemId && { itemId }) },
    })

    await createNotification({
      userId: revieweeId,
      type: 'REVIEW_RECEIVED',
      title: '새 후기가 등록되었어요',
      body: `${rating}점 후기를 받았어요.`,
      data: { reviewId: review.id },
    })

    return created(review, '후기가 등록되었습니다.')
  } catch (e) {
    console.error('[POST /reviews]', e)
    return serverError()
  }
}
