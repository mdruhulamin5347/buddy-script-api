import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";
import prisma from "@/infrastructure/database/connection";
import { ZCreateComment, ZCreateFeed, ZUpdateComment, ZUpdateFeed } from "./validators";
import { ZCommentId, ZCuid, ZFeedId, ZGQuery } from "@/validators";
import { deleteFile, getImageUrl } from "@/utils/imagePath";
import cached from "@/infrastructure/cache/cache";


export class FeedController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const {content, visibility} = ZCreateFeed.parse(req.body);

    if (!content && !req.file) {
      throw AppError.badRequest("Feed must contain text or image");
    }

    const image = req.file
        ? getImageUrl(req.file.filename)
        : null;

    const feed = await prisma.feed.create({
      data: {
        content,
        image,
        visibility,
        authorId: userId
      },

      select: {
        id : true,
        content : true,
        image : true,
        visibility : true,
        likeCount : true,
        commentCount : true,
        createdAt : true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }

    });

    await cached.delPattern("feeds:*");
    res.status(201).json({
      success: true,
      message: "Feed created successfully",
      data: feed
    });
  });

getFeeds = asyncHandler(async (req: Request, res: Response) => {
  const {
    page,
    limit,
    sortBy,
    orderBy,
  } = ZGQuery.parse(req.query);

  const skip = (page - 1) * limit;

  const cacheKey = `feeds:user=${req.user.userId}:page=${page}:limit=${limit}:sortBy=${sortBy}:orderBy=${orderBy}`;

  const cachedData = await cached.get(cacheKey);

  if (cachedData) {
    const parsed = JSON.parse(cachedData);

    return res.status(200).json({
      success: true,
      message: "Feeds fetched successfully (from cache)",
      data: parsed.data,
      pagination: parsed.pagination,
    });
  }

  const orderClause: Record<string, "asc" | "desc"> = {
    [sortBy]: orderBy,
  };

  const [feeds, total] = await Promise.all([
    prisma.feed.findMany({
      skip,
      take: limit,
      orderBy: orderClause,
      select: {
        id: true,
        content: true,
        image: true,
        visibility: true,
        likeCount: true,
        commentCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),

    prisma.feed.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  const pagination = {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  await cached.set(
    cacheKey,
    JSON.stringify({
      data: feeds,
      pagination,
    }),
    60
  );

  return res.status(200).json({
    success: true,
    data: feeds,
    pagination,
  });
});


getFeed = asyncHandler(async (req: Request, res: Response) => {
    const {id:feedId} = ZCuid.parse(req.params)
    const feed = await prisma.feed.findUnique({
      where: {id : feedId},
      select: {
        id : true,
        content : true,
        image : true,
        visibility : true,
        likeCount : true,
        commentCount : true,
        createdAt : true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    if (!feed) {
      throw AppError.notFound("Feed not found");
    }

    res.status(200).json({
      success:true,
      message:"Feed fetched successfully",
      data:feed
    });
  });


  update = asyncHandler(async(req:Request, res:Response)=>{
    const {id:feedId} = ZCuid.parse(req.params);
    const validateData = ZUpdateFeed.parse(req.body)
    const feed =await prisma.feed.findUnique({
      where:{
        id:feedId
      }
    });

    if(!feed)
      throw AppError.notFound("Feed not found");

    if(feed.authorId !== req.user.userId)
      throw AppError.forbidden("You cannot update this feed");

    let image = feed.image;

    if (req.file) {

      if (feed.image) {
        await deleteFile(feed.image);
      }
      image = getImageUrl(req.file.filename);
    }
 
    const updatedFeed=await prisma.feed.update({
      where:{
        id:feedId
      },
      data:{
        content:validateData.content,
        image,
        visibility:validateData.visibility
      }
    });
    await cached.delPattern("feeds:*");
    res.json({
      success:true,
      data:updatedFeed
    });
  });







  delete = asyncHandler(async(req:Request,res:Response)=>{
    const {id:feedId}=ZCuid.parse(req.params);
    const feed=await prisma.feed.findUnique({
      where:{ id:feedId }
    });

    if(!feed)
      throw AppError.notFound("Feed not found");

    if(feed.authorId !== req.user.userId)
      throw AppError.forbidden("Not allowed");

    await prisma.feed.delete({
      where:{ id:feedId }
    });
    await cached.delPattern("feeds:*");

    res.json({
      success:true,
      message:"Feed deleted successfully"
    });
  });

}




export class CommentController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { feedId, content, parentId } = ZCreateComment.parse(req.body);

    const feed = await prisma.feed.findUnique({
      where: {
        id: feedId
      }
    });

    if (!feed) {
      throw AppError.notFound("Feed not found");
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, feedId: true }
      });

      if (!parentComment || parentComment.feedId !== feedId) {
        throw AppError.badRequest("Invalid parent comment");
      }
    }

    const comment = await prisma.comment.create({
      data: {
        feedId,
        content,
        parentId: parentId || null,
        authorId: userId
      },

      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }

    });

    await prisma.$transaction([
      prisma.feed.update({
        where: { id: feedId },
        data: { commentCount: { increment: 1 } }
      }),
      ...(parentId
        ? [prisma.comment.update({
            where: { id: parentId },
            data: { replyCount: { increment: 1 } }
          })]
        : [])
    ]);

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: comment
    });

  });








  getByFeed = asyncHandler(async (req: Request, res: Response) => {
    const {feedId} = ZFeedId.parse(req.params)
    const comments = await prisma.comment.findMany({
      where: {
        feedId: feedId,
        parentId: null
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        replies: {
          orderBy: {
            createdAt: "asc"
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: comments
    });

  });



  


    getById = asyncHandler(async (req: Request, res: Response) => {
    const {id:commentId} = ZCuid.parse(req.params);

    const comment = await prisma.comment.findUnique({
        where: {
        id: commentId,
        },

        include: {
        author: {
            select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            },
        },

        replies: {
            orderBy: {
            createdAt: "asc",
            },

            include: {
            author: {
                select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                },
            },
            },
        },
        },
    });

    if (!comment) {
        throw AppError.notFound("Comment not found");
    }

    return res.status(200).json({
        success: true,
        data: comment,
    });
    });




    update = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;

    const { id : commentId }  = ZCuid.parse(req.params);
    const { content } = ZUpdateComment.parse(req.body);

    const comment = await prisma.comment.findUnique({
        where: {
        id: commentId,
        },
        select: {
        authorId: true,
        },
    });

    if (!comment) {
        throw AppError.notFound("Comment not found");
    }

    if (comment.authorId !== userId) {
        throw AppError.forbidden("You are not allowed to update this comment");
    }

    const updatedComment = await prisma.comment.update({
        where: {
        id: commentId,
        },

        data: {
        content,
        },

        include: {
        author: {
            select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            },
        },
        },
    });

    return res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        data: updatedComment,
    });
    });



  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id : commentId } = ZCuid.parse(req.params);
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId
      },
      select: {
        id: true,
        authorId: true,
        feedId: true,
        parentId: true
      }
    });

    if (!comment) {
      throw AppError.notFound("Comment not found");
    }

    if (comment.authorId !== req.user.userId) {
      throw AppError.forbidden("You cannot delete this comment");
    }

    await prisma.$transaction([
      prisma.comment.delete({
        where: {
          id: commentId
        }
      }),
      prisma.feed.update({
        where: { id: comment.feedId },
        data: { commentCount: { decrement: 1 } }
      }),
      ...(comment.parentId
        ? [prisma.comment.update({
            where: { id: comment.parentId },
            data: { replyCount: { decrement: 1 } }
          })]
        : [])
    ]);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  });
}




export class LikeController {
  toggleFeedLike = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const {feedId} = ZFeedId.parse(req.params);
    const existingLike = await prisma.feedLike.findUnique({
      where: {
        feedId_userId: {
          feedId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.feedLike.delete({
          where: {
            id: existingLike.id
          }
        }),
        prisma.feed.update({
          where: {
            id: feedId
          },
          data: {
            likeCount: {
              decrement: 1
            }
          }
        })
      ]);

      return res.status(200).json({
        success: true,
        liked: false,
        message: "Feed unliked"
      });
    }


    await prisma.$transaction([
      prisma.feedLike.create({
        data: {
          feedId,
          userId
        }
      }),

      prisma.feed.update({
        where: {
          id: feedId
        },
        data: {
          likeCount: {
            increment: 1
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      liked: true,
      message: "Feed liked"
    });
  });



  toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const {commentId} = ZCommentId.parse(req.params);
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.commentLike.delete({
          where: {
            id: existingLike.id
          }
        }),
        prisma.comment.update({
          where: {
            id: commentId
          },
          data: {
            likeCount: {
              decrement: 1
            }
          }
        })
      ]);

      return res.status(200).json({
        success: true,
        liked: false,
        message: "Comment unliked"
      });
    }


    await prisma.$transaction([
      prisma.commentLike.create({
        data: {
          commentId,
          userId
        }
      }),

      prisma.comment.update({
        where: {
          id: commentId
        },
        data: {
          likeCount: {
            increment: 1
          }
        }
      })
    ]);
    return res.status(200).json({
      success: true,
      liked: true,
      message: "Comment liked"
    });
  });

}