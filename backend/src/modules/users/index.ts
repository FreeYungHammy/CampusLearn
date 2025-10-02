import { Router } from "express";
import { UserController } from "./user.controller";
import { requireAuth } from "../../auth/auth.middleware";

const r = Router();
r.post("/register", UserController.register);
r.post("/login", UserController.login);
r.post("/logout", requireAuth, UserController.logout);
r.patch("/pfp", requireAuth, UserController.updatePfp);
r.patch("/profile", requireAuth, UserController.updateProfile);
r.patch("/password", requireAuth, UserController.updatePassword);
r.patch("/enrolled-courses", requireAuth, UserController.updateEnrolledCourses);
r.get("/", UserController.list);
r.get("/:userId/pfp", UserController.getPfp);
r.patch("/:id", UserController.update);

r.post("/forgot-password", UserController.forgotPassword);
r.post("/reset-password/:token", UserController.resetPassword);

// Delete account routes - MUST come before generic /:id routes
r.delete("/account", requireAuth, UserController.deleteAccount);
r.delete("/admin/:userId", requireAuth, UserController.adminDeleteUser);

// Generic routes - MUST come after specific routes
r.get("/:id", UserController.get);
r.delete("/:id", UserController.remove);

export default r;
