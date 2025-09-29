import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";
import { requireAuth, requireStudent, requireTutor } from "../../auth/auth.middleware";

const r = Router();

r.post(
  "/",
  requireAuth,
  requireStudent,
  SubscriptionController.createSubscription,
);

r.get(
  "/student/:studentId",
  requireAuth,
  SubscriptionController.getSubscribedTutors,
);

r.get(
  "/tutor/:tutorId",
  requireAuth,
  requireTutor,
  SubscriptionController.getSubscribedStudents,
);

r.delete(
  "/:tutorId",
  requireAuth,
  requireStudent,
  SubscriptionController.unsubscribe,
);

export default r;
