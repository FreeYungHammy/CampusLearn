import { Router } from "express";
import { ChatController } from "./chat.controller";
import { requireAuth } from "../../auth/auth.middleware";

const r = Router();
r.post("/", ChatController.send);
r.get("/", ChatController.list);
r.get("/conversation", ChatController.conversation); // ?a=<uid>&b=<uid>&limit=50&skip=0
r.get("/conversation/thread", ChatController.getConversationThread);
r.get("/conversations/:userId", ChatController.getConversations);
r.get("/user/:userId/status", ChatController.getUserStatus);
r.post("/conversation", ChatController.createConversation);
r.post("/thread/seen", ChatController.markThreadSeen);

r.delete(
  "/conversation/:userId1/:userId2",
  requireAuth,
  ChatController.deleteConversation,
);

r.get(
  "/conversation/exists",
  requireAuth,
  ChatController.conversationExists,
);

r.get("/:id", ChatController.get);
r.post("/:id/seen", ChatController.markSeen);
r.delete("/:id", ChatController.remove);

export default r;
