/**
 * MP4 개발용 시드 데이터
 * ─────────────────────────────────────────────────────────────
 * 실행: npm run db:seed
 *
 * 특징
 * - **멱등(idempotent)**: 모든 레코드에 고정 id(`seed-*`)를 주고 upsert 하므로
 *   몇 번을 돌려도 중복이 생기지 않는다.
 * - **식별 가능**: id 가 전부 `seed-` 로 시작하고 이메일은 `@mp4seed.dev` 다.
 *   정리하려면 해당 접두사만 지우면 된다(하단 주석 참고).
 * - **로그인 가능**: 시드 유저는 아래 SEED_PASSWORD 로 로그인된다.
 *   프론트에서 실제 계정으로 화면을 확인할 때 쓴다.
 *
 * ⚠️ 이 프로젝트는 DB가 하나(Supabase)뿐이고 배포된 API가 같은 DB를 본다.
 *    운영 데이터가 쌓이기 시작하면 시드 실행 전 반드시 확인할 것.
 */
import { PrismaClient, ItemCategory, ItemCondition, ItemStatus, Grade, Frequency, RecruitLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** 시드 유저 공통 비밀번호 — 개발 편의용 */
const SEED_PASSWORD = 'seedpass1234'

const USERS = [
  {
    id: 'seed-u1',
    email: 'minsu@mp4seed.dev',
    name: '김민수',
    nickname: '민수',
    position: '기타',
    region: '서울 마포구',
    genres: ['인디록', '얼터너티브'],
    level: '입문 6개월',
    bio: '주말 합주 위주로 활동해요. 디스코·시티팝도 좋아합니다.',
    avatar: 'https://i.pravatar.cc/240?img=12',
    activityTypes: ['play', 'trade'],
    phoneVerified: true,
  },
  {
    id: 'seed-u2',
    email: 'jieun@mp4seed.dev',
    name: '이지은',
    nickname: '지은',
    position: '보컬',
    region: '서울 서대문구',
    genres: ['시티팝', 'R&B'],
    level: '취미 3년',
    bio: '보컬입니다. 시티팝 커버 밴드 찾고 있어요.',
    avatar: 'https://i.pravatar.cc/240?img=45',
    activityTypes: ['play', 'perform'],
    phoneVerified: true,
  },
  {
    id: 'seed-u3',
    email: 'seojun@mp4seed.dev',
    name: '박서준',
    nickname: '서준',
    position: '드럼',
    region: '서울 강남구',
    genres: ['재즈', '펑크'],
    level: '경력 7년',
    bio: '세션 드러머로 활동 중입니다. 재즈·펑크 위주.',
    avatar: 'https://i.pravatar.cc/240?img=33',
    activityTypes: ['play', 'perform', 'trade'],
    phoneVerified: true,
  },
  {
    id: 'seed-u4',
    email: 'yujin@mp4seed.dev',
    name: '최유진',
    nickname: '유진',
    position: '베이스',
    region: '경기 성남시',
    genres: ['메탈', '얼터너티브'],
    level: '취미 2년',
    bio: '베이스 칩니다. 장비 거래도 자주 해요.',
    avatar: 'https://i.pravatar.cc/240?img=26',
    activityTypes: ['trade', 'play'],
    phoneVerified: false,
  },
  {
    id: 'seed-u5',
    email: 'haneul@mp4seed.dev',
    name: '정하늘',
    nickname: '하늘',
    position: '키보드',
    region: '서울 성동구',
    genres: ['일렉트로니카', '재즈'],
    level: '입문 1년',
    bio: '건반 시작한 지 얼마 안 됐어요. 입문자 환영하는 팀 찾아요!',
    avatar: 'https://i.pravatar.cc/240?img=15',
    activityTypes: ['play', 'learn'],
    phoneVerified: false,
  },
]

const ITEMS = [
  {
    id: 'seed-i1',
    title: 'Fender Player Stratocaster MX',
    description: '2022년 구매, 실내 보관만 했습니다. 프렛 소모 거의 없고 픽업 순정입니다. 하드케이스 포함해서 드려요.',
    price: 780000,
    category: ItemCategory.STRINGS,
    condition: ItemCondition.LIKE_NEW,
    brand: 'Fender', model: 'Player Stratocaster',
    grade: Grade.S, status: ItemStatus.AVAILABLE,
    location: '서울 마포구', sellerId: 'seed-u1', viewCount: 142,
    demoUrl: 'https://example.com/demo/strat.mp3', demoTitle: '클린톤 아르페지오', demoSec: 42,
    images: ['https://images.unsplash.com/photo-1550985616-10810253b84d?w=800', 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800'],
  },
  {
    id: 'seed-i2',
    title: 'Boss Katana 50 MkII 앰프',
    description: '연습용으로 최고입니다. 이사하면서 정리해요. 작동 이상 없습니다.',
    price: 250000,
    category: ItemCategory.ELECTRONIC,
    condition: ItemCondition.GOOD,
    brand: 'Boss', model: 'Katana 50 MkII',
    grade: Grade.A, status: ItemStatus.AVAILABLE,
    location: '서울 마포구', sellerId: 'seed-u1', viewCount: 88,
    images: ['https://images.unsplash.com/photo-1558098329-a11cff621064?w=800'],
  },
  {
    id: 'seed-i3',
    title: 'Fender Jazz Bass 재즈베이스',
    description: '펑크·재즈에 잘 어울립니다. 넥 상태 아주 좋아요. 직거래 선호합니다.',
    price: 920000,
    category: ItemCategory.STRINGS,
    condition: ItemCondition.GOOD,
    brand: 'Fender', model: 'Jazz Bass',
    grade: Grade.A, status: ItemStatus.AVAILABLE,
    location: '경기 성남시', sellerId: 'seed-u4', viewCount: 203,
    images: ['https://images.unsplash.com/photo-1583225214464-9296029427aa?w=800'],
  },
  {
    id: 'seed-i4',
    title: 'Pearl Export 드럼 풀세트',
    description: '합주실에 두고 쓰던 세트입니다. 심벌 별도, 스탠드 포함. 직접 보고 가져가세요.',
    price: 650000,
    category: ItemCategory.PERCUSSION,
    condition: ItemCondition.FAIR,
    brand: 'Pearl', model: 'Export EXX',
    grade: Grade.B, status: ItemStatus.RESERVED,
    location: '서울 강남구', sellerId: 'seed-u3', viewCount: 167,
    images: ['https://images.unsplash.com/photo-1571327073757-71d13c24de30?w=800'],
  },
  {
    id: 'seed-i5',
    title: 'Nord Stage 3 Compact',
    description: '무대용으로 쓰던 건반입니다. 상태 최상급이고 소프트케이스 같이 드려요.',
    price: 3200000,
    category: ItemCategory.KEYBOARD,
    condition: ItemCondition.LIKE_NEW,
    brand: 'Nord', model: 'Stage 3 Compact',
    grade: Grade.S, status: ItemStatus.AVAILABLE,
    location: '서울 성동구', sellerId: 'seed-u5', viewCount: 311,
    demoUrl: 'https://example.com/demo/nord.mp3', demoTitle: '일렉트릭 피아노 톤', demoSec: 58,
    images: ['https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800'],
  },
  {
    id: 'seed-i6',
    title: 'Strymon BigSky 리버브',
    description: '앰비언트 필수템. 박스·어댑터 다 있습니다.',
    price: 480000,
    category: ItemCategory.ELECTRONIC,
    condition: ItemCondition.LIKE_NEW,
    brand: 'Strymon', model: 'BigSky',
    grade: Grade.A, status: ItemStatus.AVAILABLE,
    location: '서울 강남구', sellerId: 'seed-u3', viewCount: 95,
    images: ['https://images.unsplash.com/photo-1596993100471-c3905dafa78e?w=800'],
  },
  {
    id: 'seed-i7',
    title: 'Shure SM58 보컬 마이크',
    description: '공연용으로 쓰던 마이크입니다. 케이블 포함.',
    price: 85000,
    category: ItemCategory.ACCESSORIES,
    condition: ItemCondition.GOOD,
    brand: 'Shure', model: 'SM58',
    grade: Grade.B, status: ItemStatus.SOLD,
    location: '서울 서대문구', sellerId: 'seed-u2', viewCount: 54,
    images: ['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'],
  },
  {
    id: 'seed-i8',
    title: 'Martin D-28 어쿠스틱',
    description: '입문 후 업그레이드하면서 내놓습니다. 사운드홀 주변 미세 흠집 있어요.',
    price: 2400000,
    category: ItemCategory.STRINGS,
    condition: ItemCondition.FAIR,
    brand: 'Martin', model: 'D-28',
    grade: Grade.B, status: ItemStatus.AVAILABLE,
    location: '서울 서대문구', sellerId: 'seed-u2', viewCount: 421,
    images: ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800'],
  },
]

const SESSION_POSTS = [
  {
    id: 'seed-s1',
    title: '인디록 밴드 기타 구합니다 (정기 합주)',
    description: '홍대 인근에서 주 1회 정기 합주하는 팀입니다. 자작곡 위주로 작업하고 있고 연말 공연 목표로 하고 있어요. 합주실은 마포구에 잡아뒀습니다.',
    genres: ['인디록', '얼터너티브'], instruments: ['기타'],
    location: '서울 마포구', pay: '합주실비 1/N',
    recruitCount: 1, freq: Frequency.REGULAR, level: RecruitLevel.BEGINNER_WELCOME,
    authorId: 'seed-u2',
  },
  {
    id: 'seed-s2',
    title: '재즈 스탠다드 세션 드러머·베이시스트',
    description: '재즈 스탠다드 위주로 연주합니다. 리얼북 기준으로 진행하고, 경력자 위주로 모집해요. 격주 토요일 오후.',
    genres: ['재즈'], instruments: ['드럼', '베이스'],
    location: '서울 강남구', pay: '5만원',
    recruitCount: 2, freq: Frequency.SHORT_TERM, level: RecruitLevel.EXPERIENCED,
    authorId: 'seed-u3',
  },
  {
    id: 'seed-s3',
    title: '시티팝 커버 원타임 합주',
    description: '이번 달 말에 한 번 모여서 시티팝 커버 몇 곡 맞춰볼 분들 구해요. 부담 없이 오세요!',
    genres: ['시티팝', 'R&B'], instruments: ['키보드', '베이스', '드럼'],
    location: '서울 서대문구', pay: '무보수',
    recruitCount: 3, freq: Frequency.ONE_TIME, level: RecruitLevel.BEGINNER_WELCOME,
    authorId: 'seed-u2',
  },
  {
    id: 'seed-s4',
    title: '메탈 밴드 보컬 모집',
    description: '스래시·멜데스 계열 합니다. 자작곡 3곡 있고 데모 녹음 예정이에요. 성남 지역 합주실 사용합니다.',
    genres: ['메탈'], instruments: ['보컬'],
    location: '경기 성남시', pay: '협의',
    recruitCount: 1, freq: Frequency.REGULAR, level: RecruitLevel.EXPERIENCED,
    authorId: 'seed-u4',
  },
  {
    id: 'seed-s5',
    title: '입문자 모여서 같이 연습해요',
    description: '악기 시작한 지 1년 안 되신 분들끼리 모여서 부담 없이 합주해요. 저도 건반 입문 1년차입니다.',
    genres: ['일렉트로니카', '인디록'], instruments: ['기타', '베이스', '드럼', '보컬'],
    location: '서울 성동구', pay: '합주실비 1/N',
    recruitCount: 4, freq: Frequency.REGULAR, level: RecruitLevel.BEGINNER_WELCOME,
    authorId: 'seed-u5',
  },
]

const CONCERT_POSTS = [
  {
    id: 'seed-c1',
    title: '홍대 라이브클럽 합동공연 팀 모집',
    description: '3월 셋째 주 홍대 클럽에서 합동공연 진행합니다. 30분 세트 소화 가능한 팀 구해요.',
    genres: ['인디록'], instruments: ['기타', '베이스', '드럼'],
    location: '서울 마포구', venue: '홍대 롤링홀',
    date: new Date('2026-09-19T19:00:00+09:00'), pay: '티켓 정산',
    recruitCount: 3, authorId: 'seed-u1',
  },
  {
    id: 'seed-c2',
    title: '재즈바 정기공연 세션 구합니다',
    description: '매월 마지막 주 금요일 재즈바 정기공연입니다. 스탠다드 위주이고 리허설 1회 있습니다.',
    genres: ['재즈'], instruments: ['키보드', '베이스'],
    location: '서울 강남구', venue: '청담 블루노트',
    date: new Date('2026-08-28T20:00:00+09:00'), pay: '10만원',
    recruitCount: 2, authorId: 'seed-u3',
  },
  {
    id: 'seed-c3',
    title: '대학 축제 무대 백밴드',
    description: '9월 대학 축제 무대에 설 백밴드 구합니다. 보컬은 정해져 있고 연주자만 모아요.',
    genres: ['시티팝', 'R&B'], instruments: ['기타', '드럼', '키보드'],
    location: '서울 서대문구', venue: '연세대 노천극장',
    date: new Date('2026-09-05T17:00:00+09:00'), pay: '협의',
    recruitCount: 3, authorId: 'seed-u2',
  },
  {
    id: 'seed-c4',
    title: '버스킹 팀원 모집 (한강)',
    description: '주말 한강에서 버스킹합니다. 앰프·마이크는 제가 준비해요. 편하게 연락 주세요.',
    genres: ['인디록', '포크'], instruments: ['기타', '보컬'],
    location: '서울 성동구', venue: '뚝섬한강공원',
    date: new Date('2026-08-09T16:00:00+09:00'), pay: '무보수',
    recruitCount: 2, authorId: 'seed-u5',
  },
]

/** 받은 후기 — 평균 평점·신뢰점수 집계를 확인하려면 필요하다 */
const REVIEWS = [
  { id: 'seed-r1', reviewerId: 'seed-u2', revieweeId: 'seed-u1', itemId: 'seed-i2', rating: 5, content: '시간 약속 잘 지키시고 장비 상태도 설명 그대로였어요.' },
  { id: 'seed-r2', reviewerId: 'seed-u3', revieweeId: 'seed-u1', itemId: null, rating: 5, content: '합주 매너가 정말 좋으십니다. 또 하고 싶어요.' },
  { id: 'seed-r3', reviewerId: 'seed-u4', revieweeId: 'seed-u1', itemId: null, rating: 4, content: '연습 열심히 하고 오세요! 그래도 즐거웠습니다.' },
  { id: 'seed-r4', reviewerId: 'seed-u1', revieweeId: 'seed-u3', itemId: 'seed-i6', rating: 5, content: '이펙터 상태 최상이었습니다. 친절하셨어요.' },
  { id: 'seed-r5', reviewerId: 'seed-u5', revieweeId: 'seed-u3', itemId: null, rating: 5, content: '드럼 실력이 대단하세요. 많이 배웠습니다.' },
  { id: 'seed-r6', reviewerId: 'seed-u1', revieweeId: 'seed-u2', itemId: 'seed-i7', rating: 4, content: '마이크 잘 받았습니다. 거래 무난했어요.' },
]

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)

  // ── 유저 ──
  for (const u of USERS) {
    const { id, ...rest } = u
    await prisma.user.upsert({
      where: { id },
      update: rest,
      create: { id, ...rest, passwordHash },
    })
  }
  console.log(`✓ 유저 ${USERS.length}명`)

  // ── 장터 매물 ──
  for (const item of ITEMS) {
    const { images, ...rest } = item
    await prisma.item.upsert({ where: { id: item.id }, update: rest, create: rest })
    // 이미지는 매번 새로 깔아준다(순서 보장)
    await prisma.itemImage.deleteMany({ where: { itemId: item.id } })
    await prisma.itemImage.createMany({
      data: images.map((url, i) => ({ id: `${item.id}-img${i}`, itemId: item.id, url, sortOrder: i })),
    })
  }
  console.log(`✓ 장터 매물 ${ITEMS.length}개`)

  // ── 세션 공고 ──
  for (const p of SESSION_POSTS) {
    await prisma.sessionPost.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`✓ 세션 공고 ${SESSION_POSTS.length}개`)

  // ── 공연 공고 ──
  for (const p of CONCERT_POSTS) {
    await prisma.concertPost.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`✓ 공연 공고 ${CONCERT_POSTS.length}개`)

  // ── 후기 ──
  for (const r of REVIEWS) {
    const data = { ...r, itemId: r.itemId ?? undefined }
    await prisma.review.upsert({ where: { id: r.id }, update: data, create: data })
  }
  console.log(`✓ 후기 ${REVIEWS.length}건`)

  console.log(`\n시드 완료. 로그인 계정 예: minsu@mp4seed.dev / ${SEED_PASSWORD}`)
}

/**
 * 시드 데이터만 지우려면:
 *   prisma.review.deleteMany({ where: { id: { startsWith: 'seed-' } } })
 *   ... 나머지 모델도 동일하게 startsWith: 'seed-'
 * 관계 때문에 review → itemImage → item → post → user 순서로 지워야 한다.
 */
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
