import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, unauthorized, serverError } from '@/lib/response'

// GET /api/users — 내 프로필 조회
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, nickname: true, avatar: true,
        bio: true, phone: true, role: true, createdAt: true,
        _count: {
          select: {
            items: true,
            sessionPosts: true,
            concertPosts: true,
            reviewsReceived: true,
          },
        },
      },
    })

    return ok(user)
  } catch (e) {
    return serverError()
  }
}
