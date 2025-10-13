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
    } catch (e: any) {
      // Handle invalid credentials with proper 401 status
      if (e.message === "Invalid credentials") {
        return res.status(401).json({ message: e.message });
      }
      next(e);
    }
  },

  logout: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        await UserService.logout(token);
      }
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

  updateEnrolledCourses: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user!;
      const { enrolledCourses } = req.body;

      if (!Array.isArray(enrolledCourses)) {
        return res
          .status(400)
          .json({ message: "enrolledCourses must be an array" });
      }

      const updatedUser = await UserService.updateEnrolledCourses(
        user.id,
        enrolledCourses,
      );
      if (!updatedUser) {
        return res
          .status(500)
          .json({ message: "Failed to update enrolled courses" });
      }
      res.status(200).json({
        message: "Enrolled courses updated successfully",
        enrolledCourses: updatedUser.enrolledCourses,
      });
    } catch (e) {
      next(e);
    }
  },

  getPfp: async (req: Request, res: Response, next: NextFunction) => {
    console.log("UserController.getPfp called for userId:", req.params.userId);
    try {
      const pfp = await UserService.getPfp(req.params.userId);
      if (!pfp || !pfp.data) {
        return res.status(404).json({ message: "Profile picture not found" });
      }
      res.setHeader("Content-Type", pfp.contentType);
      res.setHeader("Cache-Control", "public, max-age=1800"); // 30 minute browser cache
      res.send(pfp.data);
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

  deleteAccount: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user!;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      await UserService.deleteAccount(user.id, password);
      res.status(200).json({ message: "Account deleted successfully" });
    } catch (e: any) {
      if (e.message === "Invalid password") {
        return res.status(401).json({ message: e.message });
      }
      if (e.message === "User not found") {
        return res.status(404).json({ message: e.message });
      }
      next(e);
    }
  },

  adminDeleteUser: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = req.user!;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;

      // Validate userId parameter
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Validate userId format (should be a valid MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Prevent admin from deleting themselves
      if (user.id === userId) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      const deletedUser = await UserService.remove(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "User deleted successfully" });
    } catch (e) {
      next(e);
    }
  },

  // Admin Statistics
  getAdminStats: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const stats = await UserService.getAdminStats();
      res.json(stats);
    } catch (e) {
      next(e);
    }
  },

  // Check email availability
  checkEmailAvailability: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const existing = await UserService.checkEmailExists(email);
      res.json({ available: !existing });
    } catch (e) {
      next(e);
    }
  },

  // Recent Activity
  getRecentActivity: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const activity = await UserService.getRecentActivity();
      res.json(activity);
    } catch (e) {
      next(e);
    }
  },

  // System Health Checks
  getSystemHealth: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { HealthService } = await import("../../services/health.service");
      const healthChecks = await HealthService.runAllChecks();
      res.json(healthChecks);
    } catch (e) {
      next(e);
    }
  },

  // System Health Score
  getSystemHealthScore: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { HealthService } = await import("../../services/health.service");
      const healthChecks = await HealthService.runAllChecks();
      const aggregateScore =
        HealthService.calculateAggregateScore(healthChecks);
      res.json(aggregateScore);
    } catch (e) {
      next(e);
    }
  },
};
