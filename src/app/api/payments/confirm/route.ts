import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, notFound, badRequest, serverError } from '@/lib/response'
import { z } from 'zod'

const confirmSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number().int().positive(),
})

// POST /api/payments/confirm — 토스 결제 승인
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = confirmSchema.safeParse(body)
    if (!parsed.success) return badRequest('결제 정보가 올바르지 않습니다.')

    const { paymentKey, orderId, amount } = parsed.data

    // DB에서 주문 확인
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      select: { id: true, amount: true, status: true, userId: true },
    })
    if (!payment) return notFound('주문을 찾을 수 없습니다.')
    if (payment.status !== 'PENDING') return badRequest('이미 처리된 결제입니다.')
    if (payment.userId !== session.user.id) return badRequest('잘못된 요청입니다.')
    if (payment.amount !== amount) return badRequest('결제 금액이 일치하지 않습니다.')

    // 토스페이먼츠 결제 승인 요청
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    if (!tossRes.ok) {
      const err = await tossRes.json()
      console.error('[Toss confirm error]', err)
      await prisma.payment.update({ where: { orderId }, data: { status: 'FAILED' } })
      return badRequest(err.message ?? '결제 승인에 실패했습니다.')
    }

    const tossData = await tossRes.json()

    // 결제 완료 처리
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: {
          paymentKey,
          status: 'PAID',
          method: tossData.method,
          escrowStatus: 'HELD',
          approvedAt: new Date(tossData.approvedAt),
        },
      }),
      // 상품 상태 → 예약중
      ...(payment ? [prisma.item.updateMany({
        where: { payments: { some: { orderId } } },
        data: { status: 'RESERVED' },
      })] : []),
    ])

    return ok({ message: '결제가 완료되었습니다.' })
  } catch (e) {
    console.error('[POST /payments/confirm]', e)
    return serverError()
  }
}
