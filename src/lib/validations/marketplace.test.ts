import { describe, it, expect } from 'vitest'
import { createItemSchema, itemQuerySchema } from './marketplace'

const base = {
  title: '펜더 텔레캐스터',
  description: '상태 좋은 일렉기타입니다. 직거래 우선.',
  price: 720000,
  category: 'STRINGS',
  condition: 'GOOD',
  imageUrls: ['https://example.com/a.jpg'],
}

describe('createItemSchema', () => {
  it('기본 필수 입력을 통과시킨다', () => {
    expect(createItemSchema.safeParse(base).success).toBe(true)
  })

  it('등급(grade)·brand·데모를 포함해도 통과한다', () => {
    const r = createItemSchema.safeParse({
      ...base, brand: 'Fender', model: 'Player Telecaster', grade: 'A',
      demoUrl: 'https://example.com/demo.mp3', demoTitle: '클린 톤', demoSec: 18,
    })
    expect(r.success).toBe(true)
  })

  it('잘못된 등급은 실패한다', () => {
    expect(createItemSchema.safeParse({ ...base, grade: 'Z' }).success).toBe(false)
  })

  it('demoUrl이 URL이 아니면 실패한다', () => {
    expect(createItemSchema.safeParse({ ...base, demoUrl: 'not-url' }).success).toBe(false)
  })

  it('demoSec이 600초를 넘으면 실패한다', () => {
    expect(createItemSchema.safeParse({ ...base, demoSec: 601 }).success).toBe(false)
  })

  it('이미지가 없으면 실패한다', () => {
    expect(createItemSchema.safeParse({ ...base, imageUrls: [] }).success).toBe(false)
  })
})

describe('itemQuerySchema', () => {
  it('grade 필터를 받는다', () => {
    const r = itemQuerySchema.safeParse({ grade: 'S' })
    expect(r.success && r.data.grade).toBe('S')
  })

  it('기본 page/limit을 채운다', () => {
    const r = itemQuerySchema.safeParse({})
    expect(r.success && r.data.page).toBe(1)
    expect(r.success && r.data.limit).toBe(20)
  })
})
