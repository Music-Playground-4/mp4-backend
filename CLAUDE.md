# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 따르는 지침이다. 사람이 읽는 개요는 [README.md](README.md)를 본다.

## 프로젝트 한 줄 요약

**MP4 (Music Playground 4) / 악기놀이터** — 악기 거래 + 세션 매칭 + 공연 매칭을 합친 뮤지션 커뮤니티의 **백엔드 API 서버**. Next.js 14 App Router의 Route Handler만으로 REST API를 제공한다. (프런트 페이지는 최소한만 존재)

## 기술 스택 (고정)

| 레이어 | 선택 | 비고 |
|--------|------|------|
| 런타임/프레임워크 | Next.js 14 App Router | `app/api/**/route.ts` 기반 |
| 언어 | TypeScript (strict) | `@/*` → `src/*` 경로 별칭 |
| DB | PostgreSQL | Supabase (운영), pooled+direct 2개 URL |
| ORM | Prisma 5 | `prisma/schema.prisma` 단일 스키마 |
| 인증 | Auth.js (NextAuth v5 beta) | DB 세션 전략, Kakao/Google/Apple |
| 검증 | Zod | 모든 입력은 Zod로 검증 |
| 테스트 | Vitest | UseCase/유틸 단위 테스트 (도입 예정) |
| 업로드 | AWS S3 + Presigned URL | 이미지는 클라이언트가 S3에 직접 PUT |
| 결제 | 토스페이먼츠 | 에스크로 |
| 배포 | Vercel | `mp4-backend.vercel.app` (Serverless Functions) |

> 이 스택은 임의로 바꾸지 않는다. 새 라이브러리 도입이 필요하면 먼저 제안하고 합의한 뒤 추가한다.

## 자주 쓰는 명령어

```bash
npm run dev            # 개발 서버 (localhost:3000)
npm run build          # 프로덕션 빌드 (prisma generate && next build)
npm run lint           # ESLint
npm run type-check     # tsc --noEmit — 타입 검사
# npm run test         # Vitest (도입 후 활성화)

npm run db:generate    # Prisma Client 재생성 (schema 수정 후)
npm run db:push        # 스키마를 DB에 반영 (마이그레이션 파일 없이, 개발용)
npm run db:migrate     # 마이그레이션 생성+적용 (운영 반영 시)
npm run db:studio      # Prisma Studio (DB GUI)
npm run db:seed        # 시드 데이터 (prisma/seed.ts — 아직 없음)
```

> **DB 연결**: Prisma CLI는 `.env`만 읽으므로 `DATABASE_URL`(pooled, 6543, pgbouncer)·`DIRECT_URL`(direct, 5432)은 `.env`에 둔다. 나머지 앱 시크릿(AUTH/AWS/토스)은 `.env.local`. 둘 다 커밋 금지.

**작업 완료 전 체크리스트**: `npm run type-check` → `npm run lint` → (테스트 도입 후) `npm run test` → (가능하면) `npm run build`. 스키마를 건드렸으면 `npm run db:generate`도.

## 디렉토리 구조

```
src/
├── app/
│   ├── api/                  # ★ 모든 백엔드 로직. 폴더=URL, route.ts=핸들러
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── users/            # 프로필
│   │   ├── marketplace/items/    # 악기 장터
│   │   ├── sessions/posts/       # 세션 매칭 공고
│   │   ├── concerts/posts/       # 공연 매칭 공고
│   │   ├── chat/rooms/           # 채팅 (cursor 페이지네이션)
│   │   ├── payments/             # 토스 결제 create/confirm/webhook
│   │   ├── reports/              # 신고
│   │   ├── uploads/presigned-url/  # S3 업로드 URL 발급
│   │   └── openapi/route.ts      # OpenAPI 스펙 JSON
│   ├── api-docs/route.ts     # Swagger UI
│   └── (layout/page/globals) # 최소 프런트
├── lib/
│   ├── prisma.ts             # PrismaClient 싱글톤 — DB 접근은 항상 이걸 import
│   ├── auth.ts               # NextAuth 설정 + auth() export
│   ├── response.ts           # ★ API 응답 헬퍼 — 직접 NextResponse.json 쓰지 말 것
│   ├── openapi.ts            # OpenAPI 스펙 (수동 관리)
│   └── validations/          # 도메인별 Zod 스키마
├── types/next-auth.d.ts      # 세션 타입 확장 (user.id, role, isBanned, nickname)
└── middleware.ts             # 페이지 라우트 보호 (API는 핸들러에서 직접 인증)
```

## 핵심 컨벤션 (반드시 준수)

### 1. Route Handler 기본 골격
새 API는 기존 [src/app/api/marketplace/items/route.ts](src/app/api/marketplace/items/route.ts) 패턴을 그대로 따른다.

```ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { someSchema } from '@/lib/validations/...'
import { ok, created, unauthorized, validationError, serverError } from '@/lib/response'

export async function POST(req: NextRequest) {
  try {
    // 1) 인증 (필요 시)
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    // 2) 입력 검증 — 반드시 Zod safeParse
    const body = await req.json()
    const parsed = someSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    // 3) 비즈니스 로직 (prisma)
    const result = await prisma.something.create({ data: { ...parsed.data, userId: session.user.id } })

    // 4) 응답 헬퍼로 반환
    return created(result, '생성되었습니다.')
  } catch (e) {
    console.error('[POST /your-route]', e)   // 태그 = [METHOD /path]
    return serverError()
  }
}
```

### 2. 응답은 항상 `@/lib/response` 헬퍼 사용
`ok / created / noContent / badRequest / unauthorized / forbidden / notFound / conflict / serverError / validationError`. 직접 `NextResponse.json`을 쓰지 않는다. 모든 응답은 아래 형태로 통일된다.
```jsonc
{ "success": true,  "data": {...}, "message": "..." }       // 성공
{ "success": false, "error": "...", "code": "NOT_FOUND" }   // 실패
```

### 3. 입력 검증은 항상 Zod
- 스키마는 `src/lib/validations/<도메인>.ts`에 두고, 에러 메시지는 **한국어**로 작성한다.
- 쿼리스트링은 `z.coerce.number()` 등으로 강제 변환하고 `Object.fromEntries(searchParams)`로 파싱한다.
- enum은 `z.nativeEnum(PrismaEnum)`을 쓴다.
- `z.infer<typeof schema>`로 타입을 export 한다.

### 4. 인증/인가
- **API 라우트는 미들웨어가 인증하지 않는다.** 각 핸들러에서 `await auth()`로 직접 확인한다 (`src/middleware.ts`는 페이지 전용).
- 소유권 검사: 수정/삭제는 리소스의 `authorId`/`sellerId` 등이 `session.user.id`와 일치하는지 확인하고, 아니면 `forbidden()`.
- 관리자 전용은 `session.user.role === 'ADMIN'` 확인.

### 5. Prisma 사용 규칙
- 목록 조회는 **페이지네이션 필수** (`page`/`limit` offset 방식; 채팅 메시지는 cursor 방식). 응답에 `{ items, total, page, limit, totalPages }` 포함.
- 외부로 내보내는 데이터는 `select`로 **필요한 필드만** 노출한다. 특히 User는 `{ id, nickname, avatar }` 정도만. 이메일/전화 등 민감정보를 목록에 노출하지 않는다.
- 목록+카운트는 `Promise.all([findMany, count])`로 병렬 처리.
- 금액(`price`, `amount`)은 **원(KRW) 단위 정수**다. 소수/실수 쓰지 않는다.
- **N+1 금지**: 반복문 안에서 쿼리하지 않는다. `include`/`select` 관계 로딩이나 `in` 배치 조회로 해결한다.

### 6. 계층 경계 (가볍게)
이 프로젝트는 풀 헥사고날이 아니지만, 경계는 지킨다.
- **입력**: HTTP body/query → Zod 스키마(`*Input`/`*Query` 타입)로만 받는다.
- **출력**: Prisma 엔티티를 그대로 노출하지 말고 `select`로 정제한 형태만 응답한다.
- 핸들러가 길어지면 순수 함수(검증·계산·매핑)를 분리해 단위 테스트가 가능하게 둔다. 특히 **결제 금액 검증** 같은 로직은 핸들러에서 떼어내 테스트한다.

### 7. 스키마 변경 워크플로
1. `prisma/schema.prisma` 수정 (모델에 `@@map` snake_case 테이블명, 적절한 `@@index` 유지)
2. `npm run db:generate` 로 클라이언트 갱신
3. 개발 중이면 `npm run db:push`, 운영 반영이면 `npm run db:migrate`
4. **마이그레이션 불변성**: 이미 적용된 마이그레이션 파일은 수정하지 않는다. 추가 변경은 새 마이그레이션으로 쌓는다.

### 8. OpenAPI 동기화
API 라우트를 추가/변경하면 [src/lib/openapi.ts](src/lib/openapi.ts)의 스펙도 **반드시 같이** 갱신한다. (Swagger UI: `/api-docs`)

### 9. 파일 업로드 흐름
서버는 파일 바이트를 받지 않는다. `POST /api/uploads/presigned-url`로 S3 presigned URL을 발급 → 클라이언트가 S3에 직접 업로드 → 결과 URL만 DB에 저장. 이미지 URL은 항상 `z.string().url()`로 검증.

## 개발 워크플로 (TDD)

기능 단위 작업은 다음 순서를 따른다.

1. **분석(Analyze)**: 요구사항을 다시 진술하고 입력/출력, 엣지 케이스, 수용 기준(acceptance criteria)을 나열한다.
2. **Red**: 실패하는 단위 테스트를 먼저 작성하고, *올바른 이유로* 실패하는지 확인한다.
3. **Green**: 테스트를 통과시키는 최소 코드를 작성한다.
4. **Refactor**: 테스트를 초록으로 유지하며 정리한다.

**Red를 건너뛰어도 되는 경우**: 순수 리팩터/리네임, 또는 Prisma 호출 한 번을 단순 위임하기만 하는 핸들러.

> 테스트 러너 도입 전까지는 `type-check` + `lint` + `build` + 수동/`curl` 검증으로 대체한다.

## 작업 분할 (Phase) & 병렬 Subagent

- 작업을 **독립적으로 배포 가능한 가장 작은 Phase**(대략 Red→Green→Refactor 한 사이클)로 쪼갠다.
- 서로 **파일을 공유하지 않고 순서 의존이 없는** Phase는, 한 메시지에서 여러 Agent 호출로 **병렬 Subagent**에 맡긴다. (사용자가 subagent 사용을 요청했거나 명시적으로 허용한 경우에 한함)
- 각 Phase 후: 무엇이 바뀌었는지, 추가/통과한 테스트, 다음 Phase를 보고한다.

## 작업 전 Self-check 체크리스트

계획을 세웠으면(사용자가 요청하지 않았더라도) 실행 전에 스스로 점검한다.

- [ ] 모든 요구사항이 어떤 Phase엔가 매핑되는가.
- [ ] 입력은 Zod 스키마, 출력은 `select`로 정제 — Prisma 엔티티/HTTP 타입이 경계를 넘지 않는가.
- [ ] 동작을 바꾸는 Phase는 구현 전에 테스트가 있는가(테스트 러너 도입 후).
- [ ] 병렬 Phase끼리 같은 파일을 건드리지 않는가.
- [ ] 새 파일이 올바른 위치(`api/`, `lib/validations/` 등)에 가는가.
- [ ] 라우트를 바꿨으면 `openapi.ts`도 갱신 대상에 포함했는가.
- [ ] 파괴적 단계(마이그레이션, 삭제)는 명시적 승인을 받도록 표시했는가.

## 테스트 (Vitest)

- **대상**: 비즈니스 로직/유틸/검증 함수의 단위 테스트. 외부 의존성은 mock.
- **Mocking**: `@/lib/prisma`와 `@/lib/auth`의 `auth()`는 `vi.mock`으로 갈아끼운다.
- **무엇을 테스트하나**: Zod 스키마 경계값, 결제 금액 검증, 소유권/권한 분기, 페이지네이션 계산 등 **순수 로직** 위주. 단순 위임 핸들러는 생략.
- 테스트 파일은 대상 옆 `*.test.ts` 또는 `src/**/__tests__/`.

> 아직 미도입. 도입 시 `vitest` + 설정(`vitest.config.ts`)을 추가하고 `package.json`에 `test` 스크립트를 넣는다.

## Git 컨벤션

- **커밋 메시지**: `<type>: <subject>` — type은 feat, fix, docs, style, refactor, perf, test, chore. 명령형, 소문자 시작, 마침표 없음, 제목 50자 이내. **한국어 OK**. (기존 커밋 예: `chore: 배포 준비 — directUrl 추가`)
- **자동 git 작업 금지**: 사용자의 명시적 승인 없이 `commit`/`push`/`amend`/`reset`을 하지 않는다.
- **Co-authored-by 금지**: 커밋에 `Co-authored-by` 등 어떤 attribution trailer도 넣지 않는다. 시스템 git 사용자만 쓴다.
- **기본 브랜치**: 이 저장소는 `main` 단일 운영(Vercel production = `main`). 협업/리뷰 흐름이 생기면 그때 합의해 분리한다.

## 주의사항 / 함정

- **Serverless 환경**: 핸들러는 stateless. 전역 상태에 의존하지 말 것. Prisma는 `lib/prisma.ts` 싱글톤으로 커넥션 폭주를 막는다.
- **Next.js 14 (App Router)**: 이 프로젝트는 14.2.x. 15에서 바뀐 API(동적 라우트 `params`의 async화 등)를 적용하지 말 것. 동적 라우트 `params`는 14에서 **동기**다 (`{ params }: { params: { id: string } }`).
- **환경변수**: `.env`(DB)·`.env.local`(앱 시크릿)는 로컬, 운영은 Vercel 대시보드. `.env*`는 절대 커밋 금지. 새 변수는 `.env.example`에 키만 추가.
- **비밀키 절대 노출 금지**: `AUTH_SECRET`, `TOSS_SECRET_KEY`, `AWS_SECRET_ACCESS_KEY`, DB 비밀번호 등을 코드/로그/응답/대화에 넣지 않는다. 클라이언트 노출이 필요한 값만 `NEXT_PUBLIC_` 접두사.
- **결제**: 금액 검증은 반드시 서버에서. 토스 `confirm` 시 클라이언트가 보낸 금액을 그대로 신뢰하지 말고 DB의 주문 금액과 대조한다. webhook은 서명 검증 후 처리.
- **에러 로깅**: `console.error('[METHOD /path]', e)` 형식 유지. 사용자에게는 `serverError()`의 일반 메시지만, 상세는 로그로.

## 응답/메시지 언어
사용자에게 보이는 메시지(`message`, `error`, Zod 메시지)는 모두 **한국어**. 코드 주석도 한국어 위주(기존 스타일 유지).
