import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, notFound, badRequest, serverError } from '@/lib/response'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const createPaymentSchema = z.object({
  itemId: z.string().cuid(),
  amount: z.number().int().positive(),
})

// POST /api/payments/create — 결제 주문 생성 (토스 결제창 열기 전)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = createPaymentSchema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다.')

    const { itemId, amount } = parsed.data

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { price: true, status: true, sellerId: true, title: true },
    })
    if (!item) return notFound('상품을 찾을 수 없습니다.')
    if (item.status !== 'AVAILABLE') return badRequest('구매 불가한 상품입니다.')
    if (item.sellerId === session.user.id) return badRequest('본인 상품은 구매할 수 없습니다.')
    if (item.price !== amount) return badRequest('결제 금액이 올바르지 않습니다.')

    const orderId = `melodix_${uuidv4().replace(/-/g, '')}`

    const payment = await prisma.payment.create({
      data: {
        orderId,
        userId: session.user.id,
        itemId,
        amount,
        status: 'PENDING',
      },
    })

    return ok({
      orderId: payment.orderId,
      amount: payment.amount,
      orderName: item.title,
      customerEmail: session.user.email,
      customerName: session.user.nickname ?? session.user.name ?? '고객',
    })
  } catch (e) {
    console.error('[POST /payments/create]', e)
    return serverError()
  }
}
