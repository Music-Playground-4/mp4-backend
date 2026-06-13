import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ok, unauthorized, badRequest, serverError } from '@/lib/response'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 10

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  folder: z.enum(['items', 'avatars', 'portfolios']).default('items'),
})

const s3 = new S3Client({ region: process.env.AWS_REGION! })

// POST /api/uploads/presigned-url — S3 Presigned URL 발급
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다.')

    const { contentType, folder } = parsed.data

    if (!ALLOWED_TYPES.includes(contentType)) {
      return badRequest(`허용되지 않는 파일 형식입니다. (허용: ${ALLOWED_TYPES.join(', ')})`)
    }

    const ext = contentType.split('/')[1]
    const key = `${folder}/${session.user.id}/${uuidv4()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: contentType,
      ContentLength: MAX_SIZE_MB * 1024 * 1024, // 최대 10MB
      Metadata: { userId: session.user.id },
    })

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5분

    const publicUrl = `${process.env.AWS_CLOUDFRONT_URL}/${key}`

    return ok({ presignedUrl, publicUrl, key })
  } catch (e) {
    console.error('[POST /uploads/presigned-url]', e)
    return serverError()
  }
}
