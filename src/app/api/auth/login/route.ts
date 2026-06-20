import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations/auth'
import { signToken } from '@/lib/auth-token'
import { ok, unauthorized, validationError, serverError } from '@/lib/response'

// POST /api/auth/login — 이메일/비밀번호 로그인 → { token, user }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatar: true, passwordHash: true },
    })

    // 존재하지 않거나, 소셜 전용 계정(비번 없음)이거나, 비번 불일치 — 모두 동일 메시지(계정 노출 방지)
    if (!user?.passwordHash) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.')

    const token = await signToken(user.id)
    const { passwordHash: _omit, ...safeUser } = user
    return ok({ token, user: safeUser }, '로그인되었습니다.')
  } catch (e) {
    console.error('[POST /auth/login]', e)
    return serverError()
  }
}
