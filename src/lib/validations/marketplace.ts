import { z } from 'zod'
import { ItemCategory, ItemCondition } from '@prisma/client'

export const createItemSchema = z.object({
  title: z.string().min(2, '제목은 2자 이상 입력해주세요.').max(100),
  description: z.string().min(10, '설명은 10자 이상 입력해주세요.').max(5000),
  price: z.number().int().min(0, '가격은 0원 이상이어야 합니다.').max(100_000_000),
  category: z.nativeEnum(ItemCategory),
  condition: z.nativeEnum(ItemCondition),
  location: z.string().max(100).optional(),
  imageUrls: z.array(z.string().url()).min(1, '사진을 최소 1장 업로드해주세요.').max(10),
})

export const updateItemSchema = createItemSchema.partial().omit({ imageUrls: true })

export const itemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.nativeEnum(ItemCategory).optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  q: z.string().max(100).optional(),   // 검색어
  sort: z.enum(['latest', 'price_asc', 'price_desc']).default('latest'),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type ItemQuery = z.infer<typeof itemQuerySchema>
