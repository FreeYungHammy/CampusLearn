import { Router } from "express";
import { TutorApplicationController } from "./tutor-application.controller";
import { requireAdmin, requireAuth } from "../../auth/auth.middleware";

const router = Router();

router.post("/tutor", TutorApplicationController.create);
router.get(
  "/",
  requireAuth,
  requireAdmin,
  TutorApplicationController.list,
);
router.get(
  "/:id",
  requireAuth,
  requireAdmin,
  TutorApplicationController.getById,
);
router.get(
  "/:id/pdf",
  requireAuth,
  requireAdmin,
  TutorApplicationController.getPdf,
);
router.post(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  TutorApplicationController.approve,
);
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  TutorApplicationController.reject,
);

export const tutorApplicationRoutes = router;
