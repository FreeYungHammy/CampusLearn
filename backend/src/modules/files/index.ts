import { Router } from "express";
import { FileController } from "./file.controller";
import { requireTutor } from "../../auth/auth.middleware";

const r = Router();
r.post("/", FileController.create);
r.get("/", FileController.list);

// Secure endpoint: current tutor's content (meta only, excludes binary)
r.get("/my-content", requireTutor, FileController.myContent);
// Public convenience: list content by tutor's user id (no auth, for functionality-first phase)
r.get("/by-user/:userId", FileController.byUser);

r.get("/by-tutor/:tutorId", FileController.byTutor);
r.get("/:id/binary", FileController.getBinary);
r.get("/:id", FileController.getMeta);
r.patch("/:id", FileController.update);
r.delete("/:id", FileController.remove);

export default r;
