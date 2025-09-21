import { Router } from "express";
import { ForumController } from "./forum.controller";
import { requireAuth } from "../../auth/auth.middleware";

const router = Router();

router.post("/threads", requireAuth, ForumController.createThread);
router.get("/threads", requireAuth, ForumController.getThreads);
router.get("/threads/:threadId", requireAuth, ForumController.getThreadById);
router.post(
  "/threads/:threadId/replies",
  requireAuth,
  ForumController.createReply,
);

router.post("/threads/:threadId/vote", requireAuth, ForumController.voteOnPost);
router.post("/replies/:replyId/vote", requireAuth, ForumController.voteOnReply);

router.delete("/threads/:threadId", requireAuth, ForumController.deleteThread);
router.delete("/replies/:replyId", requireAuth, ForumController.deleteReply);

router.patch("/threads/:threadId", requireAuth, ForumController.updateThread);
router.patch("/replies/:replyId", requireAuth, ForumController.updateReply);

export default router;
