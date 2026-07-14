import { z } from 'zod';

export const ZCuid = z.object({
  id: z.cuid2('Invalid UUID format for id parameter')
});

export const ZFeedId = z.object({
  feedId:z.cuid2('Invalid UUID format for id parameter')
})

export const ZCommentId = z.object({
  commentId:z.cuid2('Invalid UUID format for id parameter')
})

export const ZGQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().default('createdAt'),
  orderBy: z.enum(['asc', 'desc']).default('desc'),
});

