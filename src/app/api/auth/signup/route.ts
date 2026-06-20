import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validations/auth'
import { signToken } from '@/lib/auth-token'
import { created, conflict, validationError, serverError } from '@/lib/response'

// POST /api/auth/signup — 이메일/비밀번호 회원가입 → { token, user }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { email, password, name } = parsed.data

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) return conflict('이미 가입된 이메일입니다.')

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, name: true, email: true, avatar: true },
    })

    const token = await signToken(user.id)
    return created({ token, user }, '회원가입이 완료되었습니다.')
  } catch (e) {
    console.error('[POST /auth/signup]', e)
    return serverError()
  }
}
