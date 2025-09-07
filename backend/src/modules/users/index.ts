import { Router } from "express";
import { UserController } from "./user.controller";

const r = Router();
r.post("/register", UserController.register);
r.post("/login", UserController.login);
r.post("/logout", UserController.logout);
r.get("/", UserController.list);
r.get("/:id", UserController.get);
r.patch("/:id", UserController.update);
r.delete("/:id", UserController.remove);

export default r;
