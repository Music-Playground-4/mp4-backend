import { describe, it, expect } from 'vitest'
import { calculateTrust, trustLevel } from './trust'

const none = {
  phoneVerified: false,
  profileComplete: false,
  avgRating: null,
  reviewCount: 0,
  soldCount: 0,
  hasDemo: false,
}

describe('trustLevel', () => {
  it('점수 구간별 등급', () => {
    expect(trustLevel(0)).toBe('C')
    expect(trustLevel(40)).toBe('B')
    expect(trustLevel(60)).toBe('A')
    expect(trustLevel(80)).toBe('S')
  })
})

describe('calculateTrust', () => {
  it('아무 것도 없으면 0점 C', () => {
    const r = calculateTrust(none)
    expect(r.score).toBe(0)
    expect(r.level).toBe('C')
    expect(r.items).toHaveLength(5)
    expect(r.items.every((i) => !i.earned)).toBe(true)
  })

  it('본인인증만 하면 15점', () => {
    expect(calculateTrust({ ...none, phoneVerified: true }).score).toBe(15)
  })

  it('후기는 평균 4.0 이상 + 1건 이상이어야 인정', () => {
    expect(calculateTrust({ ...none, avgRating: 3.5, reviewCount: 5 }).items.find((i) => i.key === 'review')!.earned).toBe(false)
    expect(calculateTrust({ ...none, avgRating: 4.8, reviewCount: 5 }).items.find((i) => i.key === 'review')!.earned).toBe(true)
    expect(calculateTrust({ ...none, avgRating: 5, reviewCount: 0 }).items.find((i) => i.key === 'review')!.earned).toBe(false)
  })

  it('모든 항목을 채우면 60점 A', () => {
    const r = calculateTrust({
      phoneVerified: true, profileComplete: true, avgRating: 4.9, reviewCount: 3, soldCount: 2, hasDemo: true,
    })
    expect(r.score).toBe(60)
    expect(r.level).toBe('A')
  })
})
