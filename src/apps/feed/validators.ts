
import { z } from 'zod';


export const ZCreateFeed = z.object({
  content: z.string()
    .trim()
    .max(5000, "Feed content too long")
    .optional(),

  visibility: z.enum([
      "PUBLIC",
      "PRIVATE"
    ])
    .default("PUBLIC")

});



export const ZUpdateFeed = z.object({
  content: z.string()
    .trim()
    .max(5000)
    .optional(),
  visibility: z.enum([
      "PUBLIC",
      "PRIVATE"
    ])
    .optional()

});



export const ZCreateComment = z.object({
  feedId: z.cuid("Invalid feed id"),
  content: z
    .string()
    .trim()
    .min(1,"Comment cannot be empty")
    .max(2000,"Comment too long"),
  parentId: z.cuid("Invalid parent comment id")
    .optional()
    .nullable()
});

export const ZUpdateComment = z.object({
  content: z
    .string()
    .trim()
    .min(1,"Comment cannot be empty")
    .max(2000,"Comment too long"),
});





export const ZFeedLike = z.object({
  feedId: z.cuid("Invalid feed id")
});


export const ZCommentLike = z.object({
  commentId: z.cuid("Invalid comment id")
});






export type CreateFeedInput = z.infer<typeof ZCreateFeed>;
export type UpdateFeedInput = z.infer<typeof ZUpdateFeed>;

export type CreateCommentInput = z.infer<typeof ZCreateComment>;

export type FeedLikeInput = z.infer<typeof ZFeedLike>;
export type CommentLikeInput = z.infer<typeof ZCommentLike>;