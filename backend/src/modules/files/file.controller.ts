import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";

const upload = multer({ storage: multer.memoryStorage() });

export const FileController = {
  create: [
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = { ...req.body };
        if (req.file) {
          body.file = {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
          };
        }
        const created = await FileService.create(body);
        res.status(201).json(created);
      } catch (e) {
        next(e);
      }
    },
  ],

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
      res.setHeader("Content-Type", item.contentType);
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
      if (req.file) {
        body.file = {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        };
      }
      const updated = await FileService.update(req.params.id, body);
      if (!updated) return res.status(404).json({ message: "File not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  byTutor: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutor(req.params.tutorId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  byUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutorUserId(req.params.userId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  myContent: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const items = await FileService.byTutorUserId(userId);
      res.json(items);
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
