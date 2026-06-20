import { z } from 'zod'

// 회원가입 — 이메일/비밀번호/이름
export const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72, '비밀번호가 너무 깁니다.'),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
})

// 로그인 — 이메일/비밀번호
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
