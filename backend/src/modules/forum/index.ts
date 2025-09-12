import { Router } from "express";
import { ForumController } from "./forum.controller";
import { requireAuth } from "../../auth/auth.middleware";

const router = Router();

router.post("/threads", requireAuth, ForumController.createThread);
router.get("/threads", ForumController.getThreads);
router.get("/threads/:threadId", ForumController.getThreadById);
router.post(
  "/threads/:threadId/replies",
  requireAuth,
  ForumController.createReply,
);

export default router;
