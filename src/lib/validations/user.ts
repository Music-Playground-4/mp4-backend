import { z } from 'zod'

// 프로필 수정 / 온보딩 — 모든 필드는 선택(부분 수정). 알 수 없는 키는 거부(strict).
export const updateProfileSchema = z
  .object({
    nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다.').max(30).optional(),
    bio: z.string().max(500, '소개는 500자 이내여야 합니다.').optional(),
    phone: z.string().max(20).optional(),
    avatar: z.string().url('올바른 이미지 URL이 아닙니다.').optional(),
    position: z.string().max(30).optional(),
    region: z.string().max(50).optional(),
    genres: z.array(z.string().max(20)).max(10, '장르는 최대 10개까지 선택할 수 있습니다.').optional(),
    level: z.string().max(50).optional(),
    activityTypes: z
      .array(z.enum(['play', 'perform', 'trade', 'learn']))
      .max(4)
      .optional(),
  })
  .strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
