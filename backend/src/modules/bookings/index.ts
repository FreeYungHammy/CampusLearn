import { Router } from "express";
import { BookingController } from "./booking.controller";
import { requireAuth, requireStudent, requireTutor } from "../../auth/auth.middleware";

const r = Router();

// Create booking (students and tutors can create bookings)
r.post(
  "/",
  requireAuth,
  BookingController.create
);

// Get booking by ID
r.get(
  "/:id",
  requireAuth,
  BookingController.getById
);

// Get bookings for a specific student
r.get(
  "/student/:studentId",
  requireAuth,
  BookingController.getByStudent
);

// Get bookings for a specific tutor
r.get(
  "/tutor/:tutorId",
  requireAuth,
  BookingController.getByTutor
);

// Get current user's bookings (student or tutor)
r.get(
  "/my/bookings",
  requireAuth,
  BookingController.getMyBookings
);

// Check tutor availability for a specific time slot
r.get(
  "/check-availability/:tutorId",
  requireAuth,
  BookingController.checkAvailability
);

// Update booking status (confirmed, cancelled, completed)
r.patch(
  "/:id/status",
  requireAuth,
  BookingController.updateStatus
);

// Cancel booking (shortcut for setting status to cancelled)
r.patch(
  "/:id/cancel",
  requireAuth,
  BookingController.cancel
);

// Delete booking
r.delete(
  "/:id",
  requireAuth,
  BookingController.delete
);

export default r;
