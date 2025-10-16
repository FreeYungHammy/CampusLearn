import { Request, Response, NextFunction } from "express";
import { BroadcastService } from "./broadcast.service";

function requireBotpressToken(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== process.env.BOTPRESS_INTERNAL_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export const BroadcastController = {
  requireBotpressToken,

  checkRole: async (req: Request, res: Response) => {
    const { conversationId } = req.body || {};
    if (!conversationId)
      return res
        .status(400)
        .json({ allowed: false, error: "conversationId required" });
    try {
      res.json(await BroadcastService.checkRole(conversationId));
    } catch {
      res.status(500).json({ allowed: false, error: "check-role failed" });
    }
  },

  send: async (req: Request, res: Response) => {
    const { conversationId, message } = req.body || {};
    if (!conversationId || !message)
      return res
        .status(400)
        .json({
          ok: false,
          sent: 0,
          error: "conversationId and message required",
        });
    try {
      const data = await BroadcastService.broadcast(conversationId, message);
      if (!data.ok && data.error === "Unknown user")
        return res.status(401).json(data);
      if (!data.ok && data.error === "Only tutors can broadcast")
        return res.status(403).json(data);
      res.json(data);
    } catch {
      res.status(500).json({ ok: false, sent: 0, error: "broadcast failed" });
    }
  },
};
