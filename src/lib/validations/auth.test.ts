import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema } from './auth'

describe('signupSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    const r = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', name: '홍길동' })
    expect(r.success).toBe(true)
  })

  it('이메일 형식이 틀리면 실패한다', () => {
    const r = signupSchema.safeParse({ email: 'not-email', password: '12345678', name: '홍길동' })
    expect(r.success).toBe(false)
  })

  it('비밀번호가 8자 미만이면 실패한다', () => {
    const r = signupSchema.safeParse({ email: 'a@b.com', password: '1234567', name: '홍길동' })
    expect(r.success).toBe(false)
  })

  it('이름이 비어있으면 실패한다', () => {
    const r = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', name: '' })
    expect(r.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('정상 입력을 통과시킨다', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x' })
    expect(r.success).toBe(true)
  })

  it('비밀번호가 비어있으면 실패한다', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(r.success).toBe(false)
  })
})
