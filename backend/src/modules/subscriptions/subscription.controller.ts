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
      console.log(`Controller: Getting subscribed students for tutorId: ${tutorId}`);
      
      // Test the repository method directly first
      const { SubscriptionRepo } = await import("./subscription.repo");
      const subscriptions = await SubscriptionRepo.findByTutorId(tutorId);
      console.log(`Controller: Found ${subscriptions.length} subscriptions directly`);
      
      const students = await SubscriptionService.getSubscribedStudents(tutorId);
      console.log(`Controller: Returning ${students.length} students`);
      res.status(200).json(students);
    } catch (error: any) {
      console.error(`Controller: Error getting subscribed students for tutorId: ${req.params.tutorId}`, error);
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
