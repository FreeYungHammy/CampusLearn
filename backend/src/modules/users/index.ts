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
r.get("/stats", UserController.getUserStats);
r.get("/:userId/pfp", UserController.getPfp);
r.patch("/:id", UserController.update);

r.post("/forgot-password", UserController.forgotPassword);
r.post("/reset-password/:token", UserController.resetPassword);

// Email availability check - MUST come before generic /:id routes
r.get("/check-email", UserController.checkEmailAvailability);

// Delete account routes - MUST come before generic /:id routes
r.delete("/account", requireAuth, UserController.deleteAccount);
r.delete("/admin/:userId", requireAuth, UserController.adminDeleteUser);

// Email verification routes
r.get("/verify-email/:token", UserController.verifyEmail);
r.post("/resend-verification", UserController.resendEmailVerification);

// Email preferences routes
r.get("/email-preferences", requireAuth, UserController.getEmailPreferences);
r.patch("/email-preferences", requireAuth, UserController.updateEmailPreferences);

// Admin dashboard routes
r.get("/admin/stats", requireAuth, UserController.getAdminStats);
r.get("/admin/activity", requireAuth, UserController.getRecentActivity);
r.get("/admin/health", requireAuth, UserController.getSystemHealth);
r.get("/admin/health-score", requireAuth, UserController.getSystemHealthScore);

// Generic routes - MUST come after specific routes
r.get("/:id", UserController.get);
r.delete("/:id", UserController.remove);

export default r;
