import { Router } from "express";
import { ChatController } from "./chat.controller";

const r = Router();
r.post("/", ChatController.send);
r.get("/", ChatController.list);
r.get("/conversation", ChatController.conversation); // ?a=<uid>&b=<uid>&limit=50&skip=0
r.get("/:id", ChatController.get);
r.post("/:id/seen", ChatController.markSeen);
r.post("/thread/seen", ChatController.markThreadSeen);
r.delete("/:id", ChatController.remove);

export default r;
