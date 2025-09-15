import { SubscriptionService } from "./subscription.service";
import { AuthedRequest } from "../../auth/auth.middleware";
import { Request, Response } from "express";

export const SubscriptionController = {
  async createSubscription(req: AuthedRequest, res: Response) {
    try {
      const { tutorId } = req.body;
      if (!tutorId) {
        return res.status(400).json({ error: "tutorId is required" });
      }

      const subscription = await SubscriptionService.createSubscription(
        req.user as any,
        tutorId,
      );

      res.status(201).json(subscription);
    } catch (error: any) {
      if (error.name === "NotFound" || error.name === "Conflict") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },

  async getSubscribedTutors(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const tutors = await SubscriptionService.getSubscribedTutors(studentId);
      res.status(200).json(tutors);
    } catch (error: any) {
      if (error.name === "NotFound") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },

  async getSubscribedStudents(req: Request, res: Response) {
    try {
      const { tutorId } = req.params;
      const students = await SubscriptionService.getSubscribedStudents(tutorId);
      res.status(200).json(students);
    } catch (error: any) {
      if (error.name === "NotFound") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },

  async unsubscribe(req: AuthedRequest, res: Response) {
    try {
      const { tutorId } = req.params;
      await SubscriptionService.unsubscribe(req.user as any, tutorId);
      res.status(204).send();
    } catch (error: any) {
      if (error.name === "NotFound") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },
};
