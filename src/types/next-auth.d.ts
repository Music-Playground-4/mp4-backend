import { Role } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      isBanned: boolean
      nickname: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    isBanned: boolean
    nickname: string | null
  }
}
