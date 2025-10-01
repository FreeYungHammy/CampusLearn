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
r.get("/:id", UserController.get);
r.get("/:userId/pfp", UserController.getPfp);
r.patch("/:id", UserController.update);
r.delete("/:id", UserController.remove);

r.post("/forgot-password", UserController.forgotPassword);
r.post("/reset-password/:token", UserController.resetPassword);

export default r;
