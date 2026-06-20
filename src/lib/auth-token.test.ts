import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, getBearerToken, getBearerUserId } from './auth-token'

describe('signToken / verifyToken', () => {
  it('발급한 토큰을 검증하면 같은 userId가 나온다 (roundtrip)', async () => {
    const token = await signToken('user-123')
    expect(await verifyToken(token)).toBe('user-123')
  })

  it('변조/엉터리 토큰은 null을 반환한다', async () => {
    expect(await verifyToken('garbage.token.value')).toBeNull()
  })

  it('다른 시크릿으로 서명된 듯한 변조 토큰은 거부한다', async () => {
    const token = await signToken('user-123')
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa')
    expect(await verifyToken(tampered)).toBeNull()
  })
})

describe('getBearerToken', () => {
  const make = (auth?: string) =>
    new Request('http://x', auth ? { headers: { authorization: auth } } : undefined)

  it('Bearer 헤더에서 토큰을 추출한다', () => {
    expect(getBearerToken(make('Bearer abc.def'))).toBe('abc.def')
  })

  it('헤더가 없으면 null', () => {
    expect(getBearerToken(make())).toBeNull()
  })

  it('Bearer 접두사가 없으면 null', () => {
    expect(getBearerToken(make('Token abc'))).toBeNull()
  })

  it('빈 토큰이면 null', () => {
    expect(getBearerToken(make('Bearer '))).toBeNull()
  })
})

describe('getBearerUserId', () => {
  it('유효한 Bearer 토큰에서 userId를 복원한다', async () => {
    const token = await signToken('user-xyz')
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
    expect(await getBearerUserId(req)).toBe('user-xyz')
  })

  it('토큰이 없으면 null', async () => {
    expect(await getBearerUserId(new Request('http://x'))).toBeNull()
  })
})
