# MP4 백엔드 개발 계획 (프론트 역설계 기반)

> 프론트(`mp4-user-ui`) 31개 화면이 기대하는 데이터·액션을 역설계해, 현재 백엔드와의 갭을 메우는 단계별 계획. 이 문서는 살아있는 계획서로, Phase 완료 시 체크하며 갱신한다.

## 확정된 의사결정

- **인증**: 이메일+비밀번호(Credentials) + **자체 JWT(Bearer 토큰)** 방식을 추가한다. 프론트가 `localStorage` + `Authorization: Bearer` + `/auth/login|signup|me|logout`을 기대하므로 거기에 맞춘다. 기존 OAuth(NextAuth)는 소셜 로그인용으로 남겨둔다.
- **공연 자동 팀빌딩**: 후순위(Phase 6). MVP에서 제외하고 핵심 기능부터 완성한다.

## 도입 필요 라이브러리 (합의 후 추가)

CLAUDE.md 규칙상 새 라이브러리는 합의 후 추가한다. 이 계획은 아래를 전제로 한다.

| 패키지 | 용도 | Phase |
|--------|------|-------|
| `bcryptjs` | 비밀번호 해싱 | 0 |
| `jose` | JWT 발급/검증 (Edge 호환, NextAuth와 동일 계열) | 0 |

## 갭 요약 (프론트 요구 vs 백엔드 현황)

| 도메인 | 프론트 기대 | 백엔드 현황 | 작업 |
|---|---|---|---|
| 인증 | 이메일+비번, Bearer 토큰 | OAuth+쿠키만 | Phase 0 |
| 유저 프로필 | 포지션·지역·장르·레벨·활동유형 | nickname/bio/avatar | Phase 1 |
| 악기 장터 | 등급·brand·model·찜·데모음원·거리 | condition·viewCount | Phase 2 |
| 리뷰/알림 | 후기·알림 | 모델만, API 없음 | Phase 3 |
| 세션 매칭 | freq·level·지원 수락/거절 | instruments·지원 GET/POST | Phase 4 |
| 채팅 | 거래 1:1 + 세션/공연 그룹챗 | 1:1만 | Phase 5 |
| 자동 팀빌딩 | Team/Slot/매칭% | 없음 | Phase 6 (후순위) |
| 신뢰점수 | 점수·레벨·배지·내역 | 없음 | Phase 7 |

---

## Phase 0 — 인증 정렬 (Credentials + JWT) ★최우선

프론트가 붙으려면 이게 먼저다. 프론트 `lib/api.ts`의 ENDPOINTS(`/auth/login`, `/auth/signup`, `/auth/me`, `/auth/logout`)에 1:1 대응한다.

**스키마**
- `User`에 `passwordHash String?` 추가 (소셜 가입자는 null).

**라이브러리**: `bcryptjs`, `jose`

**라우트**
- `POST /api/auth/signup` — email/password/name → 유저 생성(bcrypt 해싱) + JWT 발급 → `{ token, user }`
- `POST /api/auth/login` — email/password 검증 → `{ token, user }` (실패 401)
- `GET  /api/auth/me` — `Authorization: Bearer` 검증 → `user`
- `POST /api/auth/logout` — 클라이언트 토큰 폐기(서버는 stateless, 204)

**공통 인증 헬퍼** (`src/lib/auth-token.ts` 신규)
- `signToken(userId)`, `verifyToken(token)` (jose)
- `getAuthUser(req)` — 요청에서 Bearer 토큰 → userId. **기존 라우트의 `await auth()`(쿠키 세션)와 둘 다 인식**하도록 통합 헬퍼 `getSession(req)`를 만들어 점진 교체.

**검증** (`src/lib/validations/auth.ts`)
- `signupSchema`(email/password 8자+/name), `loginSchema`.

**테스트**: 비번 해싱·검증, JWT 발급/만료, 잘못된 비번 401, 중복 이메일 409.

**주의**: 프론트 `AuthResult { token, user }` / `AuthUser { id, name, email, avatar }` 형태에 응답을 정확히 맞춘다. (현재 응답 헬퍼 `ok()`는 `{success,data}`로 감싸므로, 프론트 `api.ts`의 응답 매핑과 합을 맞춰야 함 — 프론트 `request()`가 `data`를 어떻게 꺼내는지 확인 후 정렬.)

---

## Phase 1 — User 프로필 확장 + 온보딩

프론트 `User`(position/region/genres/level)와 회원가입 플로우(활동유형 선택 → 프로필 셋업).

**스키마** — `User`에 추가:
- `position String?` (주 포지션), `region String?`, `genres String[]`, `level String?`
- `activityTypes String[]` (play/perform/trade/learn)
- `phoneVerified Boolean @default(false)` (신뢰점수 본인인증용, Phase 7 선반영)

**라우트**
- `PATCH /api/users/me` — 프로필/온보딩 정보 갱신 (기존 `users/[id]` PUT 정리)
- `GET /api/users/[id]` — 공개 프로필에 position/region/genres/level + 보유 악기 포함

**검증**: `updateProfileSchema` (포지션/지역/장르/레벨/활동유형).

**테스트**: 온보딩 필수값, 본인 외 수정 차단(403).

---

## Phase 2 — 악기 장터 보강

프론트 `Gear`: 등급(S/A/B/C)·brand·model·찜·데모음원·거리.

**스키마**
- `Item`에 `brand String?`, `model String?`, `grade Grade` (enum 신규 S/A/B/C — 거래 신뢰등급), `demoUrl String?`, `demoTitle String?`, `demoSec Int?` 추가. 기존 `condition`은 유지(중고 상태).
- 위치/거리: `latitude Float?`, `longitude Float?` (거리 계산용, 선택).
- `Favorite` 모델 신규: `userId`, `itemId`, `@@unique([userId, itemId])`.

**라우트**
- `POST   /api/marketplace/items/[id]/favorite` — 찜
- `DELETE /api/marketplace/items/[id]/favorite` — 찜 해제
- `GET    /api/marketplace/favorites` — 내 찜 목록
- 목록/상세 응답에 `favCount`, `isFavorited` 포함. 필터(카테고리/지역/가격/등급) 보강.
- 데모 음원: `uploads/presigned-url`을 오디오 contentType도 허용하도록 확장.

**테스트**: 찜 토글 멱등성, 중복 찜 방지, favCount 집계.

---

## Phase 3 — 리뷰 + 알림 API (모델은 이미 존재)

**라우트**
- `POST /api/reviews` — 거래/세션 후 후기 (rating 1~5)
- `GET  /api/users/[id]/reviews` — 받은 후기 목록 + 평균
- `GET  /api/notifications` — 내 알림 목록 (페이지네이션)
- `PATCH /api/notifications/[id]/read` / `POST /api/notifications/read-all`

**검증**: `createReviewSchema`. **테스트**: 중복 후기 방지, 평균 계산, 본인 알림만 조회.

알림 발생 지점(채팅·지원·거래·후기)에서 `Notification` 생성 로직을 각 Phase에 연결.

---

## Phase 4 — 세션 매칭 보강

프론트 `Post`: freq(정기/단기/원타임), level(입문환영/경력자), 지원 수락/거절.

**스키마** — `SessionPost`에 `freq Frequency`(enum 신규), `level RecruitLevel`(enum 신규) 추가. (공연 `ConcertPost`에도 동일 적용 검토)

**라우트**
- `PATCH /api/sessions/posts/[id]/applications/[appId]` — 지원 수락/거절(status 변경, 작성자만) + 지원자에게 알림
- 지원자 관리 화면(`applicants`) 대응: 지원자 목록에 프로필 요약 포함.

**테스트**: 작성자만 수락/거절(403), 상태 전이 검증.

---

## Phase 5 — 그룹 채팅 (채팅 모델 리팩터)

프론트 채팅 3종: 거래(1:1) / 세션 그룹챗 / 공연 팀챗. 현재는 buyer-seller-item 1:1뿐.

**스키마** — `ChatRoom` 리팩터:
- `type ChatRoomType` (MARKET/SESSION/CONCERT) 추가
- `ChatRoomMember` 모델 신규(다대다: userId, roomId, lastReadAt) — 그룹 지원
- 기존 buyer/seller/item은 MARKET 타입 호환 유지(마이그레이션 주의)

**라우트**
- 세션/공연 채팅방 생성·멤버 관리, 통합 목록(`GET /api/chat/rooms`가 3종 모두 반환)
- 메시지 라우트는 멤버십 기반 권한으로 재정의.

**주의**: 운영 DB에 기존 1:1 데이터가 있으면 **마이그레이션 불변성** 규칙대로 새 마이그레이션으로 점진 이행.

---

## Phase 6 — 공연 자동 팀빌딩 (후순위)

> MVP 제외. 아래는 설계 메모.

- **스키마**: `ConcertPost` 보강(host, tags[], imageUrl, intro, preferGenres[]). `Team`(공연·주차) + `TeamSlot`(포지션·유저·상태 매칭중/확정) 모델.
- **매칭**: 장르·실력(level)·지역 기반 점수. 주차(week) 단위, 미확정 시 다음 주차 이월.
- **확정 시**: 그룹 채팅방(Phase 5) 자동 생성.
- `match %`는 저장보다 조회 시 동적 계산 권장.

---

## Phase 7 — 신뢰점수 시스템

프론트 `my/trust`: 점수(0~100)·레벨(S≥80/A/B/C)·배지·점수 내역.

- **스키마**: `User`에 집계 캐시(`trustScore Int`, `trustLevel`) 또는 조회 시 계산. `Badge`/`UserBadge` 검토.
- **점수 항목**(프론트 기준): 본인인증 +15, 프로필100% +10, 약속이행 +24, 후기평균 +16, 거래완료 +11, 데모등록 +8, 연속활동 +10, A등급장비 +6.
- **라우트**: `GET /api/users/[id]/trust` — 점수·레벨·배지·내역.
- 노쇼/약속이행 추적을 위해 세션/공연 참여 결과 기록 필요(Phase 4/5와 연계).

---

## 진행 원칙

- 각 Phase = `schema 변경 → db:generate → validation → route → openapi.ts 갱신 → 테스트` 한 사이클(CLAUDE.md TDD).
- Phase 0~1은 순차(인증·유저가 토대). Phase 2/3/4는 상호 독립이라 병렬 가능.
- 스키마 변경은 운영 반영 전 `db:push`(개발) → 안정화 후 `db:migrate`.
- 라우트 추가 시 `src/lib/openapi.ts` 동기화 필수.
- 프론트 연동은 Phase 0 완료 후 `NEXT_PUBLIC_API_BASE_URL` 설정 + `lib/api.ts` ENDPOINTS 매핑으로 점진 전환.
