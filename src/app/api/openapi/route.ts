import { NextResponse } from 'next/server'
import { getOpenApiSpec } from '@/lib/openapi'

// GET /api/openapi — OpenAPI 3.0 스펙(JSON). Swagger UI가 이걸 읽어 렌더링.
export function GET() {
  return NextResponse.json(getOpenApiSpec())
}
