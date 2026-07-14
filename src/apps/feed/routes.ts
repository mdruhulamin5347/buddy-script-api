import { Router } from "express";
import { FeedController,CommentController, LikeController } from "@/apps/feed/controllers";
import { authenticate } from "@/middleware/authenticate";
import { ZCommentId, ZCuid, ZFeedId } from "@/validators";
import { validate, validateId } from "@/middleware/validate";
import { ZCreateComment, ZCreateFeed, ZUpdateComment, ZUpdateFeed } from "./validators";
import z from "zod";
import { upload } from "@/middleware/uploads";

const feedRouter = Router();

const feedController = new FeedController();
const commentController = new CommentController();
const likeController = new LikeController();

feedRouter.use(authenticate);

// Feed Routes
feedRouter.post(
  "/posts",
  upload.single("image"),
  validate(ZCreateFeed),
  feedController.create
);
feedRouter.get(
  "/posts",
  feedController.getFeeds
);
feedRouter.get(
  "/posts/:id",
  validateId(ZCuid),
  feedController.getFeed
);
feedRouter.patch(
  "/posts/:id",
  upload.single("image"),
  validateId(ZCuid),
  validate(ZUpdateFeed),
  feedController.update
);
feedRouter.delete(
  "/posts/:id",
  validateId(ZCuid),
  feedController.delete
);



// Comment Routes
feedRouter.post(
  "/comments",
  validate(ZCreateComment),
  commentController.create
);
feedRouter.patch(
  "/comments/:id",
  validateId(ZCuid),
  validate(ZUpdateComment),
  commentController.update
);
feedRouter.get(
  "/comments/feed/:feedId",
  validateId(ZFeedId),
  commentController.getByFeed
);
feedRouter.get(
  "/comments/:id",
  validateId(ZCuid),
  commentController.getById
);
feedRouter.delete(
  "/comments/:id",
  validateId(ZCuid),
  commentController.delete
);




// Like / Unlike Feed
feedRouter.post(
  "/likes/post/:feedId",
  validateId(ZFeedId),
  likeController.toggleFeedLike
);
// Like / Unlike Comment
feedRouter.post(
  "/likes/comment/:commentId",
  validateId(ZCommentId),
  likeController.toggleCommentLike
);

export default feedRouter;