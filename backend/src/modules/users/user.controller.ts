import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { AuthedRequest } from "../../auth/auth.middleware";

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

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("jwt");
      res.status(200).json({ message: "Logged out successfully" });
    } catch (e) {
      next(e);
    }
  },

  updatePfp: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { pfp } = req.body;
      await UserService.updatePfp(user.id, pfp);
      res.status(200).json({ message: "Profile picture updated successfully" });
    } catch (e) {
      next(e);
    }
  },

  updateProfile: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user!;
      const { firstName, lastName } = req.body;
      await UserService.updateProfile(user.id, firstName, lastName);
      res.status(200).json({ message: "Profile updated successfully" });
    } catch (e) {
      next(e);
    }
  },

  updatePassword: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user!;
      const { current, new: newPassword } = req.body;
      await UserService.updatePassword(user.id, current, newPassword);
      res.status(200).json({ message: "Password updated successfully" });
    } catch (e: any) {
      if (e.message === "Invalid credentials") {
        return res.status(401).json({ message: e.message });
      }
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

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await UserService.forgotPassword(req.body.email);
      res
        .status(200)
        .json({ message: "Password reset link sent to your email." });
    } catch (e) {
      next(e);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await UserService.resetPassword(req.params.token, req.body.password);
      res.status(200).json({ message: "Password has been reset." });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  },
};
