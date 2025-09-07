import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";

export const UserController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await UserService.register(req.body);
      res.status(201).json(created);
    } catch (e: any) {
      if (e.name === "Conflict") {
        return res.status(409).json({ message: e.message });
      }
      if (e.name === "BadRequest") {
        return res.status(400).json({ message: e.message });
      }
      next(e);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await UserService.login(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  list: async (_: Request, res: Response, next: NextFunction) => {
    try {
      const users = await UserService.list();
      res.json(users);
    } catch (e) {
      next(e);
    }
  },

  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await UserService.get(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await UserService.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await UserService.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "User not found" });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
