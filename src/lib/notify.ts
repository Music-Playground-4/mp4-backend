import { prisma } from './prisma'
import type { NotificationType, Prisma } from '@prisma/client'

// 알림 생성 헬퍼. 알림 실패가 본 비즈니스 로직을 막지 않도록 예외를 삼킨다.
export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Prisma.InputJsonValue
}) {
  try {
    await prisma.notification.create({ data: input })
  } catch (e) {
    console.error('[notify]', e)
  }
}
