import { Router } from "express";
import { AdminController } from "./admin.controller";
import { requireAuth } from "../../auth/auth.middleware";

const router = Router();

// All admin routes require authentication
router.use(requireAuth);

// CRUD routes for all entity types
router.get("/:entityType", AdminController.getAllEntities);
router.get("/:entityType/:id", AdminController.getEntityById);
router.post("/:entityType", AdminController.createEntity);
router.put("/:entityType/:id", AdminController.updateEntity);
router.delete("/:entityType/:id", AdminController.deleteEntity);

export default router;
