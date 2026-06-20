import { noContent } from '@/lib/response'

// POST /api/auth/logout — 자체 JWT는 stateless라 서버 상태가 없다.
// 클라이언트가 토큰을 폐기하면 끝. (향후 토큰 블랙리스트가 필요해지면 여기서 처리)
export async function POST() {
  return noContent()
}
