import { Router } from "express";
import { FileController } from "./file.controller";
import { requireAuth, requireTutor } from "../../auth/auth.middleware";

const r = Router();
r.post("/", requireAuth, requireTutor, FileController.create);
r.get("/", FileController.list);

// Secure endpoint: current tutor's content (meta only, excludes binary)
r.get("/my-content", requireAuth, requireTutor, FileController.myContent);

// Secure endpoint: get a signed URL for a video file
r.get(
  "/videos/:filename/url",
  requireAuth,
  FileController.getSignedUrlForVideo,
);

// Public convenience: list content by tutor's user id (no auth, for functionality-first phase)
r.get("/by-user/:userId", FileController.byUser);

r.get("/by-tutor/:tutorId", FileController.byTutor);
r.get("/:id/binary", FileController.getBinary);
r.get("/:id", FileController.getMeta);
r.patch("/:id", requireAuth, requireTutor, FileController.update);
r.delete("/:id", requireAuth, requireTutor, FileController.remove);

export default r;
