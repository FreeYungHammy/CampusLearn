import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";

export const FileController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = { ...req.body };
      // if content is base64, convert to Buffer
      if (typeof body.content === "string") {
        body.content = Buffer.from(body.content, "base64");
      }
      const created = await FileService.create(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tutorId, subject, subtopic } = req.query as any;
      const filter: any = {};
      if (tutorId) filter.tutorId = tutorId;
      if (subject) filter.subject = subject;
      if (subtopic) filter.subtopic = subtopic;

      const items = await FileService.list(
        filter,
        Number(req.query.limit ?? 20),
        Number(req.query.skip ?? 0),
      );
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  getMeta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await FileService.getMeta(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  getBinary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await FileService.getWithBinary(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });

      // Return as binary stream (generic octet-stream; you can add mimeType later)
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${item.title ?? "file"}"`,
      );
      res.send((item as any).content);
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = { ...req.body };
      if (typeof body.content === "string") {
        body.content = Buffer.from(body.content, "base64");
      }
      const updated = await FileService.update(req.params.id, body);
      if (!updated) return res.status(404).json({ message: "File not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await FileService.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "File not found" });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
