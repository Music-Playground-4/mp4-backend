---
name: work-task
description: >
  MP4 백엔드의 작업 하나를 처음부터 끝까지 완주하는 워크플로. Notion 작업 보드에서 API 작업을 골라
  구현 → 검증 → dev 브랜치 커밋/푸시 → Notion 상태 '완료' 갱신 → Notion 코멘트 + Slack 보고까지
  한 사이클로 진행한다. 사용자가 "작업 시작", "다음 작업 하자", "작업 완주", "/work-task",
  "이 작업 진행해줘"처럼 Notion 작업을 실제로 개발해 끝내달라고 할 때 사용한다.
---

# work-task — 작업 완주 워크플로

MP4 백엔드(Next.js 14 API)의 작업 1건을 Notion에서 골라 코드로 끝내고 보고까지 마치는 절차다.
코드 컨벤션은 항상 [CLAUDE.md](../../../CLAUDE.md), 큰 그림은 [PLAN.md](../../../PLAN.md)를 따른다.

## 고정 정보 (이 프로젝트 전용)

- **Notion 작업 보드 데이터소스**: `collection://03464a2b-e141-4063-bba7-f9d803018b6a`
  (행 조회는 플랜 제약으로 `query_*` 도구가 막혀 있다 → `notion-search`에 `data_source_url`을 줘서 semantic search로 찾는다)
- **작업 브랜치**: `dev` (Vercel production은 `main`)
- **Slack 보고 대상**: 본인 DM `U093Z0NFNHH`
  > 팀 채널이 생기면 이 ID를 채널 ID로 교체할 것.
- **담당 배분**: 김강태=인증·유저·악기장터·결제·신뢰점수 / 길민규=세션·공연·채팅·리뷰·알림 / 공통=스키마·검색·신고·인프라

## 절차

### 1. 작업 선택
- 사용자가 작업을 지정했으면 그것을 쓴다.
- 안 했으면 `notion-search`(data_source_url 지정)로 **상태가 '시작 전'인 API 작업** 후보를 찾아 3~5개 제시하고 고르게 한다.
- 선택한 작업의 **페이지 ID**를 확보한다. PLAN.md의 어느 Phase인지 매핑한다.

### 2. 착수 표시
- `notion-update-page`(update_properties)로 그 작업의 `상태`를 **"진행 중"**, `진행 단계`를 **"💻 개발"**로 바꾼다.
- 새 작업이면 시작 전에 `git switch dev && git pull` 로 최신화한다.

### 3. 구현 (CLAUDE.md TDD)
- 분석 → (테스트) → 구현 → 리팩터. Route Handler 골격, `@/lib/response` 헬퍼, Zod 검증, Prisma 규칙을 지킨다.
- 스키마를 바꿨으면 `npm run db:generate` 후 `npm run db:push`(개발 DB 반영).
- 라우트를 추가/변경했으면 `src/lib/openapi.ts`도 갱신한다.

### 4. 검증 (모두 통과해야 다음 단계)
```bash
npm run type-check && npm run lint && npm run test && npm run build
```
하나라도 실패하면 고치고 다시. 통과 결과를 기록해 둔다(보고에 쓴다).

### 5. 커밋 / 푸시 (dev)
- 커밋 메시지: `<type>: <subject>` (feat/fix/docs/refactor/test/chore, 소문자, 50자 이내, 한국어 OK).
- **푸시 전 사용자 승인을 받는다** (CLAUDE.md: 자동 git 금지). `Co-authored-by` 트레일러 금지.
- 승인되면 `git push origin dev`. 커밋 해시를 확보한다.

### 6. Notion 갱신
- 작업 페이지 `상태` → **"완료"**, `진행 단계` → **"✅ 배포완료"**(또는 리뷰 대기면 "🔍 코드리뷰").
- `메모`에 한 줄 요약 + 커밋 해시를 적는다. (담당자 person은 자동배정 불가 → 메모에 "담당: 이름"으로)

### 7. 보고 (Notion 코멘트 + Slack 둘 다)
- **Notion**: `notion-create-comment`로 작업 페이지에 완료 보고 코멘트.
- **Slack**: `slack_send_message`로 보고 대상에 전송.
- 보고 양식(공통):
  ```
  ✅ [작업명] 완료
  • 변경: (핵심 한두 줄)
  • 검증: type-check/lint/test(N개)/build 통과
  • 커밋: <해시> (dev) — <레포 URL>/commit/<해시>
  • 다음: (있으면 후속 작업)
  ```

## 주의
- 한 번에 **작업 1건**만. 여러 개를 섞지 않는다(복잡도 관리).
- 파괴적 작업(마이그레이션, 컬럼 삭제, 페이지 삭제)은 실행 전 명시적으로 확인한다.
- 검증이 깨진 채로 커밋/보고하지 않는다. 막히면 멈추고 사용자에게 상황을 알린다.
- Notion 행 조회가 필요하면 `query_data_sources`/`query_database_view`는 쓰지 말 것(플랜 제약). `notion-search` + `notion-fetch`(페이지 ID)로 처리한다.
