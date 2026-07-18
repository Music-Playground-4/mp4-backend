// OpenAPI 3.0 명세 — 손으로 관리하는 단일 소스.
// route.ts 핸들러 + lib/validations/* (Zod) 기준으로 작성됨.
// 라우트를 추가/수정하면 이 파일도 같이 갱신하세요.

const enums = {
  ItemCategory: ['STRINGS', 'WIND', 'KEYBOARD', 'PERCUSSION', 'ELECTRONIC', 'ACCESSORIES', 'OTHER'],
  ItemCondition: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'],
  ItemStatus: ['AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN'],
  PostStatus: ['OPEN', 'CLOSED', 'CANCELLED'],
  ApplicationStatus: ['PENDING', 'ACCEPTED', 'REJECTED'],
  MessageType: ['TEXT', 'IMAGE', 'SYSTEM'],
  ReportReason: ['SPAM', 'FRAUD', 'INAPPROPRIATE', 'FAKE_ITEM', 'HARASSMENT', 'OTHER'],
}

const ENVELOPE_OK = (dataSchema: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: dataSchema,
    message: { type: 'string' },
  },
})

const ERROR_RESPONSE = {
  description: '에러',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: '로그인이 필요합니다.' },
          code: { type: 'string', example: 'UNAUTHORIZED' },
        },
      },
    },
  },
}

const jsonBody = (schema: object, required = true) => ({
  required,
  content: { 'application/json': { schema } },
})

const okJson = (description: string, dataSchema: object) => ({
  description,
  content: { 'application/json': { schema: ENVELOPE_OK(dataSchema) } },
})

const paginated = (itemsKey: string, itemSchema: object) => ({
  type: 'object',
  properties: {
    [itemsKey]: { type: 'array', items: itemSchema },
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
})

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const queryParam = (name: string, schema: object, description?: string) => ({
  name, in: 'query', required: false, schema, description,
})

const pageParams = [
  queryParam('page', { type: 'integer', minimum: 1, default: 1 }),
  queryParam('limit', { type: 'integer', minimum: 1, maximum: 50, default: 20 }),
]

export function getOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'MP4 (악기놀이터) API',
      version: '0.1.0',
      description:
        '악기 거래 + 세션 매칭 + 공연 매칭 백엔드 API.\n\n' +
        '**인증**: 대부분의 쓰기/조회 보호 엔드포인트는 NextAuth 세션 쿠키가 필요합니다. ' +
        '같은 브라우저에서 로그인한 상태라면 아래 "Try it out"이 쿠키를 자동 전송합니다.',
    },
    servers: [{ url: '/', description: '현재 호스트' }],
    tags: [
      { name: '인증' },
      { name: '사용자' },
      { name: '악기 장터' },
      { name: '세션 매칭' },
      { name: '공연 매칭' },
      { name: '채팅' },
      { name: '알림' },
      { name: '결제' },
      { name: '신고/업로드' },
    ],
    components: {
      securitySchemes: {
        // NextAuth 세션 쿠키 (개발: authjs.session-token / 배포: __Secure-authjs.session-token)
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'authjs.session-token' },
        // 이메일/비밀번호 로그인용 자체 JWT (Authorization: Bearer)
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', nullable: true },
            email: { type: 'string' },
            avatar: { type: 'string', nullable: true },
          },
        },
        AuthResult: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/AuthUser' },
          },
        },
        UserPublic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nickname: { type: 'string', nullable: true },
            avatar: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            position: { type: 'string', nullable: true, description: '주 포지션' },
            region: { type: 'string', nullable: true, description: '활동 지역' },
            genres: { type: 'array', items: { type: 'string' }, description: '선호 장르' },
            level: { type: 'string', nullable: true, description: '경력/레벨' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'integer', description: '원(KRW)' },
            category: { type: 'string', enum: enums.ItemCategory },
            condition: { type: 'string', enum: enums.ItemCondition },
            grade: { type: 'string', enum: ['S', 'A', 'B', 'C'], nullable: true, description: '거래 신뢰등급' },
            brand: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            demoUrl: { type: 'string', nullable: true, description: '데모 음원 URL' },
            demoTitle: { type: 'string', nullable: true },
            demoSec: { type: 'integer', nullable: true, description: '데모 길이(초)' },
            status: { type: 'string', enum: enums.ItemStatus },
            location: { type: 'string', nullable: true },
            viewCount: { type: 'integer' },
            favCount: { type: 'integer', description: '찜 수' },
            isFavorited: { type: 'boolean', description: '내가 찜했는지 (비로그인 시 false)' },
            createdAt: { type: 'string', format: 'date-time' },
            seller: ref('UserPublic'),
            images: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } },
          },
        },
        CreateItem: {
          type: 'object',
          required: ['title', 'description', 'price', 'category', 'condition', 'imageUrls'],
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', minLength: 10, maxLength: 5000 },
            price: { type: 'integer', minimum: 0, maximum: 100000000 },
            category: { type: 'string', enum: enums.ItemCategory },
            condition: { type: 'string', enum: enums.ItemCondition },
            brand: { type: 'string', maxLength: 50 },
            model: { type: 'string', maxLength: 50 },
            grade: { type: 'string', enum: ['S', 'A', 'B', 'C'] },
            location: { type: 'string', maxLength: 100 },
            demoUrl: { type: 'string', format: 'uri', description: '데모 음원 URL' },
            demoTitle: { type: 'string', maxLength: 100 },
            demoSec: { type: 'integer', minimum: 0, maximum: 600 },
            imageUrls: { type: 'array', items: { type: 'string', format: 'uri' }, minItems: 1, maxItems: 10 },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            genres: { type: 'array', items: { type: 'string' } },
            instruments: { type: 'array', items: { type: 'string' } },
            location: { type: 'string' },
            venue: { type: 'string', nullable: true, description: '공연 전용' },
            date: { type: 'string', format: 'date-time', nullable: true, description: '공연 전용' },
            deadline: { type: 'string', format: 'date-time', nullable: true, description: '세션 전용' },
            freq: { type: 'string', enum: ['REGULAR', 'SHORT_TERM', 'ONE_TIME'], nullable: true, description: '세션: 정기/단기/원타임' },
            level: { type: 'string', enum: ['BEGINNER_WELCOME', 'EXPERIENCED'], nullable: true, description: '세션: 입문환영/경력자' },
            pay: { type: 'string', nullable: true },
            recruitCount: { type: 'integer' },
            status: { type: 'string', enum: enums.PostStatus },
            createdAt: { type: 'string', format: 'date-time' },
            author: ref('UserPublic'),
          },
        },
        CreateSessionPost: {
          type: 'object',
          required: ['title', 'description', 'genres', 'instruments', 'location'],
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', minLength: 10, maxLength: 5000 },
            genres: { type: 'array', items: { type: 'string' }, minItems: 1 },
            instruments: { type: 'array', items: { type: 'string' }, minItems: 1 },
            location: { type: 'string', minLength: 1, maxLength: 100 },
            pay: { type: 'string', maxLength: 100 },
            recruitCount: { type: 'integer', minimum: 1, maximum: 20, default: 1 },
            deadline: { type: 'string', format: 'date-time' },
            freq: { type: 'string', enum: ['REGULAR', 'SHORT_TERM', 'ONE_TIME'] },
            level: { type: 'string', enum: ['BEGINNER_WELCOME', 'EXPERIENCED'] },
          },
        },
        ApplicationDecision: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] } },
        },
        CreateConcertPost: {
          type: 'object',
          required: ['title', 'description', 'genres', 'instruments', 'location'],
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', minLength: 10, maxLength: 5000 },
            genres: { type: 'array', items: { type: 'string' }, minItems: 1 },
            instruments: { type: 'array', items: { type: 'string' }, minItems: 1 },
            location: { type: 'string', minLength: 1, maxLength: 100 },
            venue: { type: 'string', maxLength: 100 },
            date: { type: 'string', format: 'date-time' },
            pay: { type: 'string', maxLength: 100 },
            recruitCount: { type: 'integer', minimum: 1, maximum: 50, default: 1 },
          },
        },
        Application: {
          type: 'object',
          required: [],
          properties: {
            message: { type: 'string', maxLength: 1000 },
            portfolio: { type: 'string', maxLength: 500 },
          },
        },
        UpdateProfile: {
          type: 'object',
          description: '모든 필드 선택(부분 수정). 온보딩에도 동일 스키마 사용.',
          properties: {
            nickname: { type: 'string', minLength: 2, maxLength: 30 },
            bio: { type: 'string', maxLength: 500 },
            phone: { type: 'string', maxLength: 20 },
            avatar: { type: 'string', format: 'uri' },
            position: { type: 'string', maxLength: 30, description: '주 포지션 (보컬/기타 등)' },
            region: { type: 'string', maxLength: 50, description: '활동 지역' },
            genres: { type: 'array', items: { type: 'string' }, maxItems: 10, description: '선호 장르' },
            level: { type: 'string', maxLength: 50, description: '경력/레벨 (자유 텍스트)' },
            activityTypes: {
              type: 'array',
              items: { type: 'string', enum: ['play', 'perform', 'trade', 'learn'] },
              description: '활동 유형 (회원가입 시 선택)',
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['CHAT_MESSAGE', 'ITEM_RESERVED', 'ITEM_SOLD', 'SESSION_APPLY', 'SESSION_RESULT', 'CONCERT_APPLY', 'CONCERT_RESULT', 'REVIEW_RECEIVED', 'PAYMENT', 'SYSTEM'] },
            title: { type: 'string' },
            body: { type: 'string' },
            data: { type: 'object', nullable: true },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateReview: {
          type: 'object',
          required: ['revieweeId', 'rating'],
          properties: {
            revieweeId: { type: 'string', description: '리뷰 대상 사용자 id' },
            itemId: { type: 'string', description: '거래 리뷰면 상품 id (선택)' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            content: { type: 'string', maxLength: 1000 },
          },
        },
        CreateRoom: {
          type: 'object',
          required: ['type'],
          description: 'MARKET은 sellerId(+itemId), SESSION/CONCERT는 해당 postId를 준다. 진입 시 멤버로 합류.',
          properties: {
            type: { type: 'string', enum: ['MARKET', 'SESSION', 'CONCERT'] },
            sellerId: { type: 'string', description: 'MARKET 상대 (cuid)' },
            itemId: { type: 'string', description: 'MARKET 상품 (cuid, 선택)' },
            sessionPostId: { type: 'string', description: 'SESSION 공고 (cuid)' },
            concertPostId: { type: 'string', description: 'CONCERT 공고 (cuid)' },
          },
        },
        SendMessage: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 1000 },
            type: { type: 'string', enum: ['TEXT', 'IMAGE'], default: 'TEXT' },
          },
        },
        CreatePayment: {
          type: 'object',
          required: ['itemId', 'amount'],
          properties: {
            itemId: { type: 'string', description: 'cuid' },
            amount: { type: 'integer', minimum: 1, description: '상품 가격과 일치해야 함' },
          },
        },
        ConfirmPayment: {
          type: 'object',
          required: ['paymentKey', 'orderId', 'amount'],
          properties: {
            paymentKey: { type: 'string' },
            orderId: { type: 'string' },
            amount: { type: 'integer', minimum: 1 },
          },
        },
        CreateReport: {
          type: 'object',
          required: ['reason'],
          description: 'itemId / sessionPostId / concertPostId 중 최소 하나 필수',
          properties: {
            reason: { type: 'string', enum: enums.ReportReason },
            description: { type: 'string', maxLength: 1000 },
            itemId: { type: 'string' },
            sessionPostId: { type: 'string' },
            concertPostId: { type: 'string' },
          },
        },
        PresignedUrlReq: {
          type: 'object',
          required: ['filename', 'contentType'],
          properties: {
            filename: { type: 'string', minLength: 1, maxLength: 255 },
            contentType: { type: 'string', example: 'image/jpeg' },
            folder: { type: 'string', enum: ['items', 'avatars', 'portfolios'], default: 'items' },
          },
        },
      },
    },
    paths: {
      '/api/auth/signup': {
        post: {
          tags: ['인증'], summary: '회원가입 (이메일/비밀번호)',
          requestBody: jsonBody({
            type: 'object', required: ['email', 'password', 'name'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              name: { type: 'string' },
            },
          }),
          responses: { 201: okJson('가입 완료', ref('AuthResult')), 400: ERROR_RESPONSE, 409: ERROR_RESPONSE },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['인증'], summary: '로그인 (이메일/비밀번호)',
          requestBody: jsonBody({
            type: 'object', required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          }),
          responses: { 200: okJson('로그인 성공', ref('AuthResult')), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['인증'], summary: '현재 유저 조회 (Bearer 토큰)', security: [{ bearerAuth: [] }],
          responses: { 200: okJson('현재 유저', ref('AuthUser')), 401: ERROR_RESPONSE },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['인증'], summary: '로그아웃 (클라이언트 토큰 폐기)', security: [{ bearerAuth: [] }],
          responses: { 204: { description: '로그아웃됨' } },
        },
      },
      '/api/users': {
        get: {
          tags: ['사용자'], summary: '내 프로필 조회', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { 200: okJson('내 프로필', ref('UserPublic')), 401: ERROR_RESPONSE },
        },
        patch: {
          tags: ['사용자'], summary: '내 프로필/온보딩 수정', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: jsonBody(ref('UpdateProfile')),
          responses: { 200: okJson('수정됨', ref('UserPublic')), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/users/{id}': {
        get: {
          tags: ['사용자'], summary: '공개 프로필 조회',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('공개 프로필', ref('UserPublic')), 404: ERROR_RESPONSE },
        },
        put: {
          tags: ['사용자'], summary: '프로필 수정 (본인만)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('UpdateProfile')),
          responses: { 200: okJson('수정됨', ref('UserPublic')), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
      },
      '/api/users/{id}/reviews': {
        get: {
          tags: ['사용자'], summary: '받은 후기 목록 + 평균',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, ...pageParams],
          responses: { 200: okJson('후기 목록', { type: 'object' }), 400: ERROR_RESPONSE },
        },
      },
      '/api/reviews': {
        post: {
          tags: ['사용자'], summary: '후기 작성', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateReview')),
          responses: { 201: okJson('작성됨', { type: 'object' }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE, 404: ERROR_RESPONSE, 409: ERROR_RESPONSE },
        },
      },
      '/api/marketplace/items': {
        get: {
          tags: ['악기 장터'], summary: '상품 목록 (검색/필터/정렬)',
          parameters: [
            ...pageParams,
            queryParam('category', { type: 'string', enum: enums.ItemCategory }),
            queryParam('condition', { type: 'string', enum: enums.ItemCondition }),
            queryParam('grade', { type: 'string', enum: ['S', 'A', 'B', 'C'] }),
            queryParam('minPrice', { type: 'integer', minimum: 0 }),
            queryParam('maxPrice', { type: 'integer', minimum: 0 }),
            queryParam('q', { type: 'string' }, '검색어 (제목/설명)'),
            queryParam('sort', { type: 'string', enum: ['latest', 'price_asc', 'price_desc'], default: 'latest' }),
          ],
          responses: { 200: okJson('상품 목록', paginated('items', ref('Item'))), 400: ERROR_RESPONSE },
        },
        post: {
          tags: ['악기 장터'], summary: '상품 등록', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateItem')),
          responses: { 201: okJson('등록됨', ref('Item')), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/marketplace/items/{id}': {
        get: {
          tags: ['악기 장터'], summary: '상품 상세 (조회수 증가)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('상품 상세', ref('Item')), 404: ERROR_RESPONSE },
        },
        put: {
          tags: ['악기 장터'], summary: '상품 수정 (판매자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('CreateItem')),
          responses: { 200: okJson('수정됨', ref('Item')), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
        delete: {
          tags: ['악기 장터'], summary: '상품 삭제 (판매자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: '삭제됨' }, 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/marketplace/items/{id}/favorite': {
        post: {
          tags: ['악기 장터'], summary: '찜하기 (멱등)', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 201: okJson('찜됨', { type: 'object', properties: { itemId: { type: 'string' }, favorited: { type: 'boolean' } } }), 401: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
        delete: {
          tags: ['악기 장터'], summary: '찜 해제 (멱등)', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('해제됨', { type: 'object', properties: { itemId: { type: 'string' }, favorited: { type: 'boolean' } } }), 401: ERROR_RESPONSE },
        },
      },
      '/api/marketplace/favorites': {
        get: {
          tags: ['악기 장터'], summary: '내가 찜한 상품 목록', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [...pageParams],
          responses: { 200: okJson('찜 목록', paginated('items', ref('Item'))), 401: ERROR_RESPONSE },
        },
      },
      '/api/sessions/posts': {
        get: {
          tags: ['세션 매칭'], summary: '세션 공고 목록',
          parameters: [
            ...pageParams,
            queryParam('genre', { type: 'string' }),
            queryParam('instrument', { type: 'string' }),
            queryParam('location', { type: 'string' }),
            queryParam('q', { type: 'string' }),
          ],
          responses: { 200: okJson('공고 목록', paginated('posts', ref('Post'))), 400: ERROR_RESPONSE },
        },
        post: {
          tags: ['세션 매칭'], summary: '세션 공고 작성', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateSessionPost')),
          responses: { 201: okJson('등록됨', ref('Post')), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/sessions/posts/{id}': {
        get: {
          tags: ['세션 매칭'], summary: '세션 공고 상세',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('상세', ref('Post')), 404: ERROR_RESPONSE },
        },
        put: {
          tags: ['세션 매칭'], summary: '공고 수정 (작성자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('CreateSessionPost')),
          responses: { 200: okJson('수정됨', ref('Post')), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
        delete: {
          tags: ['세션 매칭'], summary: '공고 삭제 (작성자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: '삭제됨' }, 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
      },
      '/api/sessions/posts/{id}/applications': {
        get: {
          tags: ['세션 매칭'], summary: '지원자 목록 (작성자만)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('지원자', { type: 'array', items: { type: 'object' } }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
        post: {
          tags: ['세션 매칭'], summary: '세션 지원', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('Application'), false),
          responses: { 201: okJson('지원 완료', { type: 'object' }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 409: ERROR_RESPONSE },
        },
      },
      '/api/sessions/posts/{id}/applications/{appId}': {
        patch: {
          tags: ['세션 매칭'], summary: '지원 수락/거절 (작성자만)', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'appId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: jsonBody(ref('ApplicationDecision')),
          responses: { 200: okJson('처리됨', { type: 'object' }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/concerts/posts': {
        get: {
          tags: ['공연 매칭'], summary: '공연 공고 목록',
          parameters: [
            ...pageParams,
            queryParam('genre', { type: 'string' }),
            queryParam('instrument', { type: 'string' }),
            queryParam('location', { type: 'string' }),
            queryParam('q', { type: 'string' }),
          ],
          responses: { 200: okJson('공고 목록', paginated('posts', ref('Post'))), 400: ERROR_RESPONSE },
        },
        post: {
          tags: ['공연 매칭'], summary: '공연 공고 작성', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateConcertPost')),
          responses: { 201: okJson('등록됨', ref('Post')), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/concerts/posts/{id}': {
        get: {
          tags: ['공연 매칭'], summary: '공연 공고 상세',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('상세', ref('Post')), 404: ERROR_RESPONSE },
        },
        put: {
          tags: ['공연 매칭'], summary: '공고 수정 (작성자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('CreateConcertPost')),
          responses: { 200: okJson('수정됨', ref('Post')), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
        delete: {
          tags: ['공연 매칭'], summary: '공고 삭제 (작성자/관리자)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: '삭제됨' }, 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
      },
      '/api/concerts/posts/{id}/applications': {
        get: {
          tags: ['공연 매칭'], summary: '지원자 목록 (작성자만)', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('지원자', { type: 'array', items: { type: 'object' } }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
        post: {
          tags: ['공연 매칭'], summary: '공연 지원', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('Application'), false),
          responses: { 201: okJson('지원 완료', { type: 'object' }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 409: ERROR_RESPONSE },
        },
      },
      '/api/concerts/posts/{id}/applications/{appId}': {
        patch: {
          tags: ['공연 매칭'], summary: '지원 수락/거절 (작성자만)', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'appId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: jsonBody(ref('ApplicationDecision')),
          responses: { 200: okJson('처리됨', { type: 'object' }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/chat/rooms': {
        get: {
          tags: ['채팅'], summary: '내 채팅방 목록', security: [{ cookieAuth: [] }],
          responses: { 200: okJson('채팅방', { type: 'array', items: { type: 'object' } }), 401: ERROR_RESPONSE },
        },
        post: {
          tags: ['채팅'], summary: '채팅방 생성 (기존 있으면 반환)', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateRoom')),
          responses: { 201: okJson('생성됨', { type: 'object' }), 200: okJson('기존 방', { type: 'object' }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/chat/rooms/{id}/messages': {
        get: {
          tags: ['채팅'], summary: '메시지 목록 (cursor 페이지네이션)', security: [{ cookieAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            queryParam('cursor', { type: 'string' }, '이전 페이지 마지막 메시지 id'),
            queryParam('limit', { type: 'integer', maximum: 50, default: 30 }),
          ],
          responses: { 200: okJson('메시지', { type: 'object', properties: { messages: { type: 'array', items: { type: 'object' } }, nextCursor: { type: 'string', nullable: true } } }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
        post: {
          tags: ['채팅'], summary: '메시지 전송', security: [{ cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody(ref('SendMessage')),
          responses: { 201: okJson('전송됨', { type: 'object' }), 401: ERROR_RESPONSE, 403: ERROR_RESPONSE },
        },
      },
      '/api/payments/create': {
        post: {
          tags: ['결제'], summary: '결제 주문 생성 (토스 결제창 전)', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreatePayment')),
          responses: { 200: okJson('주문 정보', { type: 'object', properties: { orderId: { type: 'string' }, amount: { type: 'integer' }, orderName: { type: 'string' }, customerEmail: { type: 'string' }, customerName: { type: 'string' } } }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/payments/confirm': {
        post: {
          tags: ['결제'], summary: '토스 결제 승인', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('ConfirmPayment')),
          responses: { 200: okJson('결제 완료', { type: 'object' }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['결제'], summary: '토스페이먼츠 웹훅 (서버→서버, 인증 헤더 별도)',
          description: '토스 대시보드에서 호출. Authorization Basic 검증. 일반 클라이언트가 쓰는 엔드포인트 아님.',
          responses: { 200: { description: 'ok' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/api/notifications': {
        get: {
          tags: ['알림'], summary: '내 알림 목록 (+안읽음 수)', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [...pageParams],
          responses: { 200: okJson('알림 목록', { type: 'object' }), 401: ERROR_RESPONSE },
        },
      },
      '/api/notifications/{id}/read': {
        patch: {
          tags: ['알림'], summary: '알림 하나 읽음', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: okJson('읽음', { type: 'object' }), 401: ERROR_RESPONSE, 404: ERROR_RESPONSE },
        },
      },
      '/api/notifications/read-all': {
        post: {
          tags: ['알림'], summary: '전체 읽음 처리', security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { 200: okJson('모두 읽음', { type: 'object' }), 401: ERROR_RESPONSE },
        },
      },
      '/api/reports': {
        post: {
          tags: ['신고/업로드'], summary: '신고 접수', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('CreateReport')),
          responses: { 201: okJson('접수됨', { type: 'object' }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
      '/api/uploads/presigned-url': {
        post: {
          tags: ['신고/업로드'], summary: 'S3 Presigned URL 발급', security: [{ cookieAuth: [] }],
          requestBody: jsonBody(ref('PresignedUrlReq')),
          responses: { 200: okJson('업로드 URL', { type: 'object', properties: { presignedUrl: { type: 'string' }, publicUrl: { type: 'string' }, key: { type: 'string' } } }), 400: ERROR_RESPONSE, 401: ERROR_RESPONSE },
        },
      },
    },
  }
}
