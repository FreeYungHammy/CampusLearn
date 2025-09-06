import { Request, Response, NextFunction } from "express";
import { StudentService } from "../students/students.service";

export const StudentController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await StudentService.create(req.body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },

  list: async (_: Request, res: Response, next: NextFunction) => {
    try {
      const items = await StudentService.list();
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await StudentService.get(req.params.id);
      if (!item) return res.status(404).json({ message: "Student not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  getByUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await StudentService.getByUser(req.params.userId);
      if (!item) return res.status(404).json({ message: "Student not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await StudentService.update(req.params.id, req.body);
      if (!updated)
        return res.status(404).json({ message: "Student not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  enroll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await StudentService.enroll(
        req.params.id,
        req.body.courseCode,
      );
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  unenroll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await StudentService.unenroll(
        req.params.id,
        req.body.courseCode,
      );
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await StudentService.remove(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: "Student not found" });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
