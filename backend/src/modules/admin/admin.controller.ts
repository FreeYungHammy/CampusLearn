import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service";
import { AuthedRequest } from "../../auth/auth.middleware";

export const AdminController = {
  // Get all entities of a specific type
  getAllEntities: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType } = req.params;
      const { page = 1, limit = 50, search = "" } = req.query;

      const result = await AdminService.getAllEntities(
        entityType,
        Number(page),
        Number(limit),
        String(search),
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Get a specific entity by ID
  getEntityById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, id } = req.params;
      const entity = await AdminService.getEntityById(entityType, id);

      if (!entity) {
        return res
          .status(404)
          .json({ message: `${entityType.slice(0, -1)} not found` });
      }

      res.json(entity);
    } catch (error) {
      next(error);
    }
  },

  // Create a new entity
  createEntity: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { entityType } = req.params;
      const data = req.body;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entity = await AdminService.createEntity(entityType, data);
      res.status(201).json(entity);
    } catch (error) {
      next(error);
    }
  },

  // Update an existing entity
  updateEntity: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { entityType, id } = req.params;
      const data = req.body;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entity = await AdminService.updateEntity(entityType, id, data);

      if (!entity) {
        return res
          .status(404)
          .json({ message: `${entityType.slice(0, -1)} not found` });
      }

      res.json(entity);
    } catch (error) {
      next(error);
    }
  },

  // Delete an entity
  deleteEntity: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { entityType, id } = req.params;

      // Check if user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deleted = await AdminService.deleteEntity(entityType, id);

      if (!deleted) {
        return res
          .status(404)
          .json({ message: `${entityType.slice(0, -1)} not found` });
      }

      res
        .status(200)
        .json({ message: `${entityType.slice(0, -1)} deleted successfully` });
    } catch (error) {
      next(error);
    }
  },
};
