import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/payments/webhook — 토스페이먼츠 웹훅 수신
// 토스 대시보드에서 웹훅 URL 설정: https://your-domain.com/api/payments/webhook
export async function POST(req: NextRequest) {
  try {
    // 웹훅 시크릿 검증
    const secret = req.headers.get('Authorization')?.replace('Basic ', '')
    if (!secret || secret !== Buffer.from(`${process.env.TOSS_WEBHOOK_SECRET}:`).toString('base64')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventType, data } = body

    console.log('[Toss Webhook]', eventType, data?.paymentKey)

    switch (eventType) {
      // 결제 완료 (confirm API 말고 웹훅으로도 처리 가능)
      case 'PAYMENT_STATUS_CHANGED': {
        const { orderId, status, paymentKey } = data
        if (status === 'DONE') {
          await prisma.payment.updateMany({
            where: { orderId, status: 'PENDING' },
            data: { status: 'PAID', paymentKey, escrowStatus: 'HELD' },
          })
        } else if (status === 'CANCELED') {
          await prisma.payment.updateMany({
            where: { orderId },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          })
        }
        break
      }

      // 에스크로 구매 확정 (구매자가 수령 확인)
      case 'ESCROW_DELIVERY_STATUS_CHANGED': {
        const { orderId, escrowDetail } = data
        if (escrowDetail?.status === 'CONFIRMED') {
          await prisma.payment.updateMany({
            where: { orderId },
            data: { escrowStatus: 'RELEASED' },
          })
          // 상품 상태 → 판매완료
          const payment = await prisma.payment.findUnique({ where: { orderId }, select: { itemId: true } })
          if (payment?.itemId) {
            await prisma.item.update({
              where: { id: payment.itemId },
              data: { status: 'SOLD' },
            })
          }
        }
        break
      }

      default:
        console.log('[Toss Webhook] unhandled event:', eventType)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[Toss Webhook Error]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
