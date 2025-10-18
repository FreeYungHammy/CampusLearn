import { Request, Response, NextFunction } from "express";
import { BookingService } from "./booking.service";
import { StudentRepo } from "../students/students.repo";
import { AuthedRequest } from "../../auth/auth.middleware";

export const BookingController = {
  async create(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      console.log("🚀 BookingController.create called");
      console.log("📋 Request body:", req.body);
      console.log("👤 User:", req.user);
      console.log("🔑 Headers:", req.headers);
      
      const bookingData = {
        ...req.body,
        initiatedBy: req.user?.role === "student" ? "student" : "tutor",
      };
      
      console.log("Final booking data:", bookingData);

      // Validate required fields
      const requiredFields = ["studentId", "tutorId", "date", "time", "duration", "subject"];
      for (const field of requiredFields) {
        if (!bookingData[field]) {
          return res.status(400).json({ error: `${field} is required` });
        }
      }

      // Validate duration
      if (bookingData.duration < 15 || bookingData.duration > 480) {
        return res.status(400).json({ error: "Duration must be between 15 and 480 minutes" });
      }

      // Validate date format (should be YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(bookingData.date)) {
        return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
      }

      // Validate time format (should be HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(bookingData.time)) {
        return res.status(400).json({ error: "Time must be in HH:MM format" });
      }

      const booking = await BookingService.create(bookingData);
      res.status(201).json(booking);
    } catch (error: any) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("already exists") || error.message.includes("Booking must be made at least one week in advance") || error.message.includes("Bookings can only be made between 08:00 and 17:00")) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes("already have a booking")) {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  },

  async checkAvailability(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { tutorId } = req.params;
      const { date, time, duration } = req.query;
      const user = req.user!;

      if (!date || !time) {
        return res.status(400).json({ error: "Date and time are required" });
      }

      const durationMinutes = duration ? parseInt(duration as string) : 60;

      // Get student ID for student conflict checking
      const student = await StudentRepo.findByUserId(user.id);
      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Check for existing bookings with duration-based conflict detection
      const existingBooking = await BookingService.checkAvailability(
        tutorId, 
        date as string, 
        time as string, 
        durationMinutes,
        student._id.toString()
      );
      
      if (existingBooking) {
        const conflictStart = existingBooking.time;
        const conflictEnd = new Date(
          new Date(`2000-01-01T${conflictStart}`).getTime() + existingBooking.duration * 60000
        ).toTimeString().slice(0, 5);
        
        // Determine if this is a tutor conflict or student conflict
        const isStudentConflict = existingBooking.studentId.toString() === student._id.toString();
        const conflictType = isStudentConflict ? 'student' : 'tutor';
        
        let message;
        if (isStudentConflict) {
          message = `You already have a booking scheduled at this time with another tutor. Conflicting booking: ${conflictStart}-${conflictEnd} (${existingBooking.duration} minutes)`;
        } else {
          message = `Tutor is not available at this time. Conflicting booking: ${conflictStart}-${conflictEnd} (${existingBooking.duration} minutes)`;
        }
        
        res.json({
          available: false,
          message,
          conflictType,
          conflictingBooking: {
            time: existingBooking.time,
            duration: existingBooking.duration,
            endTime: conflictEnd
          }
        });
      } else {
        res.json({
          available: true,
          message: "Time slot is available"
        });
      }
    } catch (error: any) {
      console.error("Error checking availability:", error);
      res.status(500).json({ error: "Failed to check availability" });
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.getById(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      next(error);
    }
  },

  async getByStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await BookingService.getByStudent(req.params.studentId);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  },

  async getByTutor(req: Request, res: Response, next: NextFunction) {
    try {
      const bookings = await BookingService.getByTutor(req.params.tutorId);
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  },

  async getMyBookings(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      let bookings;
      if (user.role === "student") {
        // Get student ID from user
        const { StudentModel } = await import("../../schemas/students.schema");
        const student = await StudentModel.findOne({ userId: user.id }).lean();
        if (!student) {
          return res.status(404).json({ error: "Student profile not found" });
        }
        bookings = await BookingService.getByStudent(student._id.toString());
      } else if (user.role === "tutor") {
        // Get tutor ID from user
        const { TutorModel } = await import("../../schemas/tutor.schema");
        const tutor = await TutorModel.findOne({ userId: user.id }).lean();
        if (!tutor) {
          return res.status(404).json({ error: "Tutor profile not found" });
        }
        bookings = await BookingService.getByTutor(tutor._id.toString());
      } else {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const validStatuses = ["confirmed", "cancelled", "completed"];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(", ") });
      }

      // Check authorization - only tutors can update booking status
      if (req.user?.role !== "tutor") {
        return res.status(403).json({ error: "Only tutors can update booking status" });
      }

      const booking = await BookingService.updateStatus(req.params.id, status, req.user);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      res.json(booking);
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.updateStatus(req.params.id, "cancelled", req.user!);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      await BookingService.delete(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async acceptBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.acceptBooking(req.params.id, req.user!);
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  },

  async rejectBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      await BookingService.rejectBooking(req.params.id, req.user!);
      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  },

  async completeBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.completeBooking(req.params.id, req.user!);
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  },

  // Auto-reject expired pending bookings (admin endpoint)
  async autoRejectExpired(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      // Only allow admins to manually trigger this
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can trigger auto-rejection" });
      }

      const rejectedCount = await BookingService.autoRejectExpiredBookings();
      res.json({ 
        message: `Auto-rejected ${rejectedCount} expired pending bookings`,
        rejectedCount 
      });
    } catch (error) {
      next(error);
    }
  },
};
