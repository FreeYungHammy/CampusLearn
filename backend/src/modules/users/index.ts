import { Router } from "express";
import { UserController } from "./user.controller";
import { requireAuth } from "../../auth/auth.middleware";

const r = Router();
r.post("/register", UserController.register);
r.post("/login", UserController.login);
r.post("/logout", UserController.logout);
r.patch("/pfp", requireAuth, UserController.updatePfp);
r.patch("/profile", requireAuth, UserController.updateProfile);
r.patch("/password", requireAuth, UserController.updatePassword);
r.get("/", UserController.list);
r.get("/:id", UserController.get);
r.patch("/:id", UserController.update);
r.delete("/:id", UserController.remove);

export default r;
