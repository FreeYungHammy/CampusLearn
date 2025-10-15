import { Request, Response, NextFunction } from "express";
import { TutorApplicationService } from "./tutor-application.service";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export const TutorApplicationController = {
  create: [
    upload.single("qualificationFile"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { body, file } = req;
        if (!file) {
          return res.status(400).json({ message: "Qualification file is required" });
        }

        const applicationData = {
          ...body,
          qualificationFile: {
            data: file.buffer,
            contentType: file.mimetype,
          },
        };

        const created = await TutorApplicationService.create(applicationData);
        res.status(201).json(created);
      } catch (e) {
        next(e);
      }
    },
  ],

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applications = await TutorApplicationService.list();
      res.json(applications);
    } catch (e) {
      next(e);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await TutorApplicationService.getById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (e) {
      next(e);
    }
  },

  getPdf: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await TutorApplicationService.getById(req.params.id);
      if (!application || !application.qualificationFile) {
        return res.status(404).json({ message: "PDF not found" });
      }

      res.setHeader("Content-Type", application.qualificationFile.contentType);
      res.send(application.qualificationFile.data);
    } catch (e) {
      next(e);
    }
  },

  approve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TutorApplicationService.approve(req.params.id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  reject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TutorApplicationService.reject(req.params.id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
};
