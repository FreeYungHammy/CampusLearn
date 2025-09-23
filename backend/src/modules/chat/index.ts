import { Router } from "express";
import { ChatController } from "./chat.controller";

const r = Router();
r.post("/", ChatController.send);
r.get("/", ChatController.list);
r.get("/conversation", ChatController.conversation); // ?a=<uid>&b=<uid>&limit=50&skip=0
r.get("/conversation/thread", ChatController.getConversationThread);
r.get("/conversations/:userId", ChatController.getConversations);
r.get("/user/:userId/status", ChatController.getUserStatus);
r.post("/conversation", ChatController.createConversation);
r.post("/thread/seen", ChatController.markThreadSeen);
r.get("/:id", ChatController.get);
r.post("/:id/seen", ChatController.markSeen);
r.delete("/:id", ChatController.remove);

export default r;
