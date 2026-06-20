import { SignJWT, jwtVerify } from 'jose'

// 이메일/비밀번호 로그인용 자체 JWT (Bearer 토큰).
// OAuth(NextAuth, 쿠키 세션)와 별개로, 프론트가 Authorization 헤더로 보내는 토큰을 처리한다.

const TOKEN_TTL = '30d'

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET 환경변수가 설정되지 않았습니다.')
  return new TextEncoder().encode(secret)
}

/** userId를 담은 JWT 발급 */
export async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret())
}

/** JWT 검증 → userId (실패 시 null) */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/** 요청의 Authorization: Bearer 헤더에서 토큰 추출 */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

/** 요청에서 Bearer 토큰을 검증해 userId 반환 (없거나 실패 시 null) */
export async function getBearerUserId(req: Request): Promise<string | null> {
  const token = getBearerToken(req)
  if (!token) return null
  return verifyToken(token)
}
