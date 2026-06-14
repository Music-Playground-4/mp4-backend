# 🎸 MP4 (Music Playground 4) — 악기놀이터 백엔드

> 악기 거래 + 세션 매칭 + 공연 매칭을 한 곳에서. 뮤지션을 위한 올인원 커뮤니티 플랫폼.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| DB | PostgreSQL (Supabase) |
| ORM | Prisma |
| 인증 | Auth.js v5 (Kakao, Google, Apple) |
| 유효성 검사 | Zod |
| 스타일링 | Tailwind CSS |
| 파일 업로드 | AWS S3 + Presigned URL |
| 결제 | 토스페이먼츠 |
| 배포 | Vercel |

## 프로젝트 구조

```
melodix/
├── prisma/
│   └── schema.prisma          # DB 스키마 전체
├── src/
│   ├── app/
│   │   └── api/               # REST API 라우트
│   │       ├── auth/          # NextAuth
│   │       ├── users/         # 프로필
│   │       ├── marketplace/   # 악기 장터
│   │       ├── sessions/      # 세션 매칭
│   │       ├── concerts/      # 공연 매칭
│   │       ├── chat/          # 채팅
│   │       ├── payments/      # 결제 (토스)
│   │       ├── reports/       # 신고
│   │       └── uploads/       # S3 Presigned URL
│   ├── lib/
│   │   ├── prisma.ts          # Prisma 클라이언트 싱글톤
│   │   ├── auth.ts            # Auth.js 설정
│   │   ├── response.ts        # API 응답 헬퍼
│   │   └── validations/       # Zod 스키마
│   └── middleware.ts          # 라우트 보호
└── .env.example
```

## API 문서 (Swagger UI)

개발 서버 실행 후 브라우저에서 확인:

- **Swagger UI**: http://localhost:3000/api-docs — 전체 엔드포인트 브라우징 + Try it out
- **OpenAPI 스펙(JSON)**: http://localhost:3000/api/openapi

> 스펙은 [src/lib/openapi.ts](src/lib/openapi.ts)에서 손으로 관리합니다. 라우트를 추가/수정하면 이 파일도 같이 갱신하세요.
> 보호된 엔드포인트는 같은 브라우저에서 로그인되어 있으면 세션 쿠키로 Try it out이 동작합니다.

## API 엔드포인트

### 인증
- `GET/POST /api/auth/[...nextauth]` — NextAuth 핸들러

### 사용자
- `GET /api/users` — 내 프로필
- `GET /api/users/:id` — 공개 프로필 조회
- `PUT /api/users/:id` — 프로필 수정

### 악기 장터
- `GET /api/marketplace/items` — 상품 목록 (검색/필터/정렬)
- `POST /api/marketplace/items` — 상품 등록
- `GET /api/marketplace/items/:id` — 상품 상세
- `PUT /api/marketplace/items/:id` — 상품 수정
- `DELETE /api/marketplace/items/:id` — 상품 삭제

### 세션 매칭
- `GET /api/sessions/posts` — 세션 공고 목록
- `POST /api/sessions/posts` — 세션 공고 작성
- `GET /api/sessions/posts/:id` — 공고 상세
- `PUT /api/sessions/posts/:id` — 공고 수정
- `DELETE /api/sessions/posts/:id` — 공고 삭제
- `GET /api/sessions/posts/:id/applications` — 지원자 목록
- `POST /api/sessions/posts/:id/applications` — 세션 지원

### 공연 매칭
- `GET /api/concerts/posts` — 공연 공고 목록
- `POST /api/concerts/posts` — 공연 공고 작성
- `GET/PUT/DELETE /api/concerts/posts/:id`
- `GET/POST /api/concerts/posts/:id/applications`

### 채팅
- `GET /api/chat/rooms` — 내 채팅방 목록
- `POST /api/chat/rooms` — 채팅방 생성
- `GET /api/chat/rooms/:id/messages` — 메시지 목록 (cursor 페이지네이션)
- `POST /api/chat/rooms/:id/messages` — 메시지 전송

### 결제
- `POST /api/payments/create` — 주문 생성
- `POST /api/payments/confirm` — 토스페이먼츠 결제 승인

### 기타
- `POST /api/reports` — 신고 접수
- `POST /api/uploads/presigned-url` — S3 업로드 URL 발급

## 시작하기

```bash
# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# DB 스키마 적용
npm run db:push

# 개발 서버 실행
npm run dev
```

## API 응답 형식

모든 API 응답은 아래 형식을 따릅니다.

```json
// 성공
{ "success": true, "data": {...}, "message": "..." }

// 실패
{ "success": false, "error": "...", "code": "NOT_FOUND" }
```
