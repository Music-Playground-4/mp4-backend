import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createItemSchema, itemQuerySchema } from '@/lib/validations/marketplace'
import { ok, created, unauthorized, validationError, serverError } from '@/lib/response'
import { ItemStatus } from '@prisma/client'

// GET /api/marketplace/items — 상품 목록
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const parsed = itemQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { page, limit, category, condition, minPrice, maxPrice, q, sort } = parsed.data
    const skip = (page - 1) * limit

    const where = {
      status: ItemStatus.AVAILABLE,
      ...(category && { category }),
      ...(condition && { condition }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { price: { gte: minPrice, lte: maxPrice } }
        : {}),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    }

    const orderBy =
      sort === 'price_asc'
        ? { price: 'asc' as const }
        : sort === 'price_desc'
        ? { price: 'desc' as const }
        : { createdAt: 'desc' as const }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          price: true,
          category: true,
          condition: true,
          status: true,
          location: true,
          viewCount: true,
          createdAt: true,
          seller: { select: { id: true, nickname: true, avatar: true } },
          images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      }),
      prisma.item.count({ where }),
    ])

    return ok({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('[GET /marketplace/items]', e)
    return serverError()
  }
}

// POST /api/marketplace/items — 상품 등록
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await req.json()
    const parsed = createItemSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as any)

    const { imageUrls, ...itemData } = parsed.data

    const item = await prisma.item.create({
      data: {
        ...itemData,
        sellerId: session.user.id,
        images: {
          create: imageUrls.map((url, i) => ({ url, sortOrder: i })),
        },
      },
      include: { images: true },
    })

    return created(item, '상품이 등록되었습니다.')
  } catch (e) {
    console.error('[POST /marketplace/items]', e)
    return serverError()
  }
}
