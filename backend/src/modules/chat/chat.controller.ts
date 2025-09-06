import { Request, Response, NextFunction } from "express";
import { ChatService } from "./chat.service";

export const ChatController = {
  send: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = { ...req.body };
      if (typeof body.upload === "string") {
        body.upload = Buffer.from(body.upload, "base64");
      }
      const created = await ChatService.send(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await ChatService.list(
        req.query as any,
        Number(req.query.limit ?? 20),
        Number(req.query.skip ?? 0),
      );
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const msg = await ChatService.get(req.params.id);
      if (!msg) return res.status(404).json({ message: "Message not found" });
      res.json(msg);
    } catch (e) {
      next(e);
    }
  },

  conversation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { a, b, limit = "50", skip = "0" } = req.query as any;
      if (!a || !b)
        return res.status(400).json({ message: "a and b userIds required" });
      const items = await ChatService.conversation(
        String(a),
        String(b),
        Number(limit),
        Number(skip),
      );
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  markSeen: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await ChatService.markSeen(req.params.id);
      if (!updated)
        return res.status(404).json({ message: "Message not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  markThreadSeen: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.body;
      if (!from || !to)
        return res
          .status(400)
          .json({ message: "from and to userIds required" });
      const result = await ChatService.markThreadSeen(String(from), String(to));
      res.json({ modified: (result as any).modifiedCount ?? undefined });
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await ChatService.remove(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: "Message not found" });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
