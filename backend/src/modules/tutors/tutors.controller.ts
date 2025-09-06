import { Request, Response, NextFunction } from "express";
import { TutorService } from "./tutor.service";

export const TutorController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await TutorService.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },

  list: async (_: Request, res: Response, next: NextFunction) => {
    try {
      const items = await TutorService.list();
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await TutorService.get(req.params.id);
      if (!item) return res.status(404).json({ message: "Tutor not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  byUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await TutorService.byUser(req.params.userId);
      if (!item) return res.status(404).json({ message: "Tutor not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  searchSubject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await TutorService.searchSubject(req.query.q as string);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await TutorService.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Tutor not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  rate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await TutorService.rate(
        req.params.id,
        Number(req.body.score),
      );
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await TutorService.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Tutor not found" });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
