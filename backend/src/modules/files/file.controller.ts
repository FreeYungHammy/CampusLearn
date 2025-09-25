import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";

const upload = multer({ storage: multer.memoryStorage() });

// List of MIME types that can be safely displayed in a browser
const VIEWABLE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "video/mp4",
];

export const FileController = {
  create: [
    upload.single("file"),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const body = { ...req.body };
        const tutor = await FileService.findTutorByUserId(req.user!.id);
        if (!tutor) {
          return res
            .status(403)
            .json({ message: "Forbidden: Only tutors can upload files." });
        }
        body.tutorId = tutor._id; // Use the actual tutor's _id

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

      // If file is stored in GCS, redirect to a signed URL
      if ((item as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const objectName = String((item as any).externalUri).replace(/^gs:\/\//, "");
        const url = await gcsService.getSignedReadUrl(objectName);
        return res.redirect(url);
      }

      const extension = mime.extension(item.contentType);
      const filename = `${item.title ?? "file"}.${extension || "bin"}`;

      const isViewable = VIEWABLE_MIME_TYPES.some((type) =>
        item.contentType.startsWith(type),
      );
      const forceDownload = req.query.download === "true";
      const disposition =
        isViewable && !forceDownload ? "inline" : "attachment";

      res.setHeader("Content-Type", item.contentType);
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${filename}"`,
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

  remove: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.id;
      const userId = req.user!.id;

      const file = await FileService.getMeta(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const isOwner = await FileService.isOwner(
        userId,
        file.tutorId.toString(),
      );

      if (!isOwner) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If GCS-backed, remove object first (best-effort)
      if ((file as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const objectName = String((file as any).externalUri).replace(/^gs:\/\//, "");
        try { await gcsService.deleteObject(objectName); } catch {}
      }

      const deleted = await FileService.remove(fileId);
      if (!deleted) return res.status(404).json({ message: "File not found" });

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
