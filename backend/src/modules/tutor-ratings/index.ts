import { Router } from "express";
import { TutorRatingController } from "./tutorRating.controller";
import { requireAuth } from "../../auth/auth.middleware";

const router = Router();

// Rate a tutor (POST /api/tutors/:tutorId/rate)
router.post("/:tutorId/rate", requireAuth, TutorRatingController.rateTutor);

// Get current user's rating for a tutor (GET /api/tutors/:tutorId/my-rating)
router.get("/:tutorId/my-rating", requireAuth, TutorRatingController.getMyRating);

// Get all ratings for a tutor (GET /api/tutors/:tutorId/ratings)
router.get("/:tutorId/ratings", TutorRatingController.getTutorRatings);

// Check if user can rate a tutor (GET /api/tutors/:tutorId/can-rate)
router.get("/:tutorId/can-rate", requireAuth, TutorRatingController.checkCanRate);

export default router;
