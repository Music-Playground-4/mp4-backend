// 신뢰점수 계산 (순수 함수).
// 프론트 my/trust 화면 대응. 현재는 추적 가능한 항목만 반영한다.
// (약속 이행/노쇼/연속 활동 등은 활동 로그가 쌓이면 추후 항목 추가)

export interface TrustInput {
  phoneVerified: boolean
  profileComplete: boolean
  avgRating: number | null
  reviewCount: number
  soldCount: number
  hasDemo: boolean
}

export type TrustLevel = 'S' | 'A' | 'B' | 'C'

export interface TrustItem {
  key: string
  label: string
  points: number
  earned: boolean
}

export interface TrustResult {
  score: number
  level: TrustLevel
  items: TrustItem[]
}

export function trustLevel(score: number): TrustLevel {
  if (score >= 80) return 'S'
  if (score >= 60) return 'A'
  if (score >= 40) return 'B'
  return 'C'
}

export function calculateTrust(input: TrustInput): TrustResult {
  const items: TrustItem[] = [
    { key: 'verify', label: '본인인증 완료', points: 15, earned: input.phoneVerified },
    { key: 'profile', label: '프로필 완성', points: 10, earned: input.profileComplete },
    {
      key: 'review',
      label: '후기 평균 4.0 이상',
      points: 16,
      earned: input.reviewCount > 0 && (input.avgRating ?? 0) >= 4,
    },
    { key: 'trade', label: '거래 완료', points: 11, earned: input.soldCount > 0 },
    { key: 'demo', label: '연주 데모 등록', points: 8, earned: input.hasDemo },
  ]

  const score = items.reduce((sum, i) => (i.earned ? sum + i.points : sum), 0)
  return { score, level: trustLevel(score), items }
}
