import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { created, unauthorized, badRequest, serverError } from '@/lib/response'
import { z } from 'zod'
import { ReportReason } from '@prisma/client'

const reportSchema = z.object({
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(1000).optional(),
  itemId: z.string().cuid().optional(),
  sessionPostId: z.string().cuid().optional(),
  concertPostId: z.string().cuid().optional(),
}).refine(
  (data) => data.itemId || data.sessionPostId || data.concertPostId,
  { message: '신고 대상을 선택해주세요.' }
)

// POST /api/reports — 신고 접수
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? '입력값 오류')

    const report = await prisma.report.create({
      data: { ...parsed.data, reporterId: session.user.id },
    })

    return created(report, '신고가 접수되었습니다. 검토 후 조치하겠습니다.')
  } catch (e) {
    return serverError()
  }
}
