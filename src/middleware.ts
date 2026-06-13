import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 로그인 필요 경로
const PROTECTED_PATHS = [
  '/profile',
  '/marketplace/new',
  '/sessions/new',
  '/concerts/new',
  '/chat',
]

// 로그인 상태에서 접근 불가 경로
const AUTH_PATHS = ['/login', '/register']

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // API 라우트는 각 핸들러에서 직접 인증 처리
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (isProtected && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 밴 유저 차단
  if (session?.user?.isBanned) {
    return NextResponse.redirect(new URL('/banned', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
