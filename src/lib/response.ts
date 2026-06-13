import { NextResponse } from 'next/server'

type ApiSuccessResponse<T> = {
  success: true
  data: T
  message?: string
}

type ApiErrorResponse = {
  success: false
  error: string
  code?: string
}

export function ok<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { success: true, data, message },
    { status }
  )
}

export function created<T>(data: T, message?: string) {
  return ok(data, message, 201)
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(error: string, code?: string) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code },
    { status: 400 }
  )
}

export function unauthorized(error = '로그인이 필요합니다.') {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

export function forbidden(error = '권한이 없습니다.') {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code: 'FORBIDDEN' },
    { status: 403 }
  )
}

export function notFound(error = '리소스를 찾을 수 없습니다.') {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code: 'NOT_FOUND' },
    { status: 404 }
  )
}

export function conflict(error: string) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code: 'CONFLICT' },
    { status: 409 }
  )
}

export function serverError(error = '서버 오류가 발생했습니다.') {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error, code: 'INTERNAL_SERVER_ERROR' },
    { status: 500 }
  )
}

// Zod validation error → 400
export function validationError(errors: Record<string, string[]>) {
  return NextResponse.json(
    { success: false, error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', errors },
    { status: 400 }
  )
}
