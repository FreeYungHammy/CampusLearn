import { Request, Response } from "express";
import { TutorRatingService } from "./tutorRating.service";
import { AuthedRequest } from "../../auth/auth.middleware";
import { StudentService } from "../students/student.service";

export const TutorRatingController = {
  async rateTutor(req: AuthedRequest, res: Response) {
    try {
      const { tutorId } = req.params;
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Get student ID from user
      const student = await StudentService.byUser(req.user!.id);
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const result = await TutorRatingService.rateTutor({
        studentId: student._id.toString(),
        tutorId,
        rating,
      });

      res.json({
        success: true,
        rating: result.rating,
        message: "Rating submitted successfully",
      });
    } catch (error: any) {
      console.error("Error rating tutor:", error);
      res.status(400).json({ error: error.message });
    }
  },

  async getMyRating(req: AuthedRequest, res: Response) {
    try {
      const { tutorId } = req.params;

      // Get student ID from user
      const student = await StudentService.byUser(req.user!.id);
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const rating = await TutorRatingService.getStudentRating(
        student._id.toString(),
        tutorId
      );

      res.json({ rating: rating?.rating || null });
    } catch (error: any) {
      console.error("Error getting rating:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async getTutorRatings(req: Request, res: Response) {
    try {
      const { tutorId } = req.params;
      const ratings = await TutorRatingService.getTutorRatings(tutorId);
      res.json({ ratings });
    } catch (error: any) {
      console.error("Error getting tutor ratings:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async checkCanRate(req: AuthedRequest, res: Response) {
    try {
      const { tutorId } = req.params;

      // Get student ID from user
      const student = await StudentService.byUser(req.user!.id);
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const result = await TutorRatingService.canStudentRate(
        student._id.toString(),
        tutorId
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error checking rating eligibility:", error);
      res.status(500).json({ error: error.message });
    }
  },
};
