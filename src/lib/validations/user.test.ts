import { describe, it, expect } from 'vitest'
import { updateProfileSchema } from './user'

describe('updateProfileSchema', () => {
  it('부분 수정(빈 객체)도 통과한다', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true)
  })

  it('온보딩 전체 입력을 통과시킨다', () => {
    const r = updateProfileSchema.safeParse({
      nickname: '강태',
      position: '기타',
      region: '서울 마포구',
      genres: ['인디록', '시티팝'],
      level: '입문 6개월',
      activityTypes: ['play', 'perform'],
    })
    expect(r.success).toBe(true)
  })

  it('닉네임이 1자면 실패한다', () => {
    expect(updateProfileSchema.safeParse({ nickname: 'A' }).success).toBe(false)
  })

  it('avatar가 URL이 아니면 실패한다', () => {
    expect(updateProfileSchema.safeParse({ avatar: 'not-url' }).success).toBe(false)
  })

  it('장르가 10개를 넘으면 실패한다', () => {
    const genres = Array.from({ length: 11 }, (_, i) => `g${i}`)
    expect(updateProfileSchema.safeParse({ genres }).success).toBe(false)
  })

  it('허용되지 않은 활동유형은 실패한다', () => {
    expect(updateProfileSchema.safeParse({ activityTypes: ['unknown'] }).success).toBe(false)
  })

  it('알 수 없는 키는 거부한다(strict)', () => {
    expect(updateProfileSchema.safeParse({ role: 'ADMIN' }).success).toBe(false)
  })
})
