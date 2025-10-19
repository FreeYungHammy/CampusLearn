import { Router } from "express";
import { AdminController } from "./admin.controller";
import { BillingController } from "./billing.controller";
import { requireAuth } from "../../auth/auth.middleware";

const router = Router();

// All admin routes require authentication
router.use(requireAuth);

// Billing routes
router.get("/billing/months", BillingController.getAvailableMonths);
router.get("/billing/tutors", BillingController.getTutorBills);

// CRUD routes for all entity types
router.get("/:entityType", AdminController.getAllEntities);
router.get("/:entityType/:id", AdminController.getEntityById);
router.post("/:entityType", AdminController.createEntity);
router.put("/:entityType/:id", AdminController.updateEntity);
router.delete("/:entityType/:id", AdminController.deleteEntity);

export default router;
