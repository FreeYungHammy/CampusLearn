import { Types } from "mongoose";
import { BookingModel, BookingDoc } from "../../schemas/booking.schema";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { UserModel } from "../../schemas/user.schema";
import { ChatService } from "../chat/chat.service";
import { emailService } from "../../services/email.service";
import { HttpException } from "../../infra/http/HttpException";

export interface CreateBookingRequest {
  studentId: string;
  tutorId: string;
  date: string;
  time: string;
  duration: number;
  subject: string;
  notes?: string;
  initiatedBy: "student" | "tutor";
}

export interface BookingWithDetails extends BookingDoc {
  student: {
    id: string;
    name: string;
    surname: string;
    email: string;
  };
  tutor: {
    id: string;
    userId: string;
    name: string;
    surname: string;
    email: string;
  };
}

export const BookingService = {
  async create(bookingData: CreateBookingRequest): Promise<BookingWithDetails> {
    try {
      console.log("🚀 BookingService.create called with:", bookingData);
      
      // Validate booking date
      this.validateBookingDate(bookingData.date);
      this.validateBookingTime(bookingData.time);

      // Validate that student and tutor exist
      const student = await StudentModel.findById(bookingData.studentId).lean();
      const tutor = await TutorModel.findById(bookingData.tutorId).lean();
      
      console.log("Student found:", student ? "Yes" : "No");
      console.log("Tutor found:", tutor ? "Yes" : "No");
      
      if (!student) {
        throw new Error("Student not found");
      }
      if (!tutor) {
        throw new Error("Tutor not found");
      }

      // Check for existing booking conflicts using improved duration-based logic
      const conflictingBooking = await this.checkAvailability(
        bookingData.tutorId, 
        bookingData.date, 
        bookingData.time, 
        bookingData.duration
      );

      if (conflictingBooking) {
        const conflictStart = conflictingBooking.time;
        const conflictEnd = new Date(
          new Date(`2000-01-01T${conflictStart}`).getTime() + conflictingBooking.duration * 60000
        ).toTimeString().slice(0, 5);
        
        throw new Error(
          `Tutor is not available at this time. Conflicting booking: ${conflictStart}-${conflictEnd} (${conflictingBooking.duration} minutes)`
        );
      }

      // Also check if the student has a conflicting booking
      const studentConflictingBooking = await BookingModel.findOne({
        studentId: bookingData.studentId,
        date: bookingData.date,
        time: bookingData.time,
        status: { $in: ["pending", "confirmed"] }
      });

      if (studentConflictingBooking) {
        throw new Error("You already have a booking scheduled at this time");
      }

      // Create the booking
      const booking = new BookingModel({
        studentId: new Types.ObjectId(bookingData.studentId),
        tutorId: new Types.ObjectId(bookingData.tutorId),
        date: bookingData.date,
        time: bookingData.time,
        duration: bookingData.duration,
        subject: bookingData.subject,
        notes: bookingData.notes || "",
        status: "pending",
        initiatedBy: bookingData.initiatedBy,
      });

      console.log("💾 Saving booking to database...");
      const savedBooking = await booking.save();
      console.log("✅ Booking saved successfully:", savedBooking);

      // Get user details for messaging
      const studentUser = await UserModel.findById(student.userId).lean();
      const tutorUser = await UserModel.findById(tutor.userId).lean();

      if (!studentUser || !tutorUser) {
        throw new Error("User details not found");
      }

      // Create chat message about the booking
      const chatId = [studentUser._id.toString(), tutorUser._id.toString()].sort().join("-");
      
      const messageContent = this.createBookingMessage(savedBooking, "booking_created");
      
      // Send message via chat service
      console.log("📤 Sending booking message via chat service...");
      console.log("💬 Message content:", messageContent);
      console.log("👤 Sender ID:", bookingData.initiatedBy === "student" ? studentUser._id.toString() : tutorUser._id.toString());
      console.log("👤 Receiver ID:", bookingData.initiatedBy === "student" ? tutorUser._id.toString() : studentUser._id.toString());
      
      await ChatService.send({
        senderId: bookingData.initiatedBy === "student" ? studentUser._id.toString() : tutorUser._id.toString(),
        receiverId: bookingData.initiatedBy === "student" ? tutorUser._id.toString() : studentUser._id.toString(),
        chatId,
        content: messageContent,
        messageType: "booking_created",
        bookingId: savedBooking._id.toString(),
      });
      
      console.log("✅ Booking message sent successfully");

      // Send booking confirmation emails
      try {
        const bookingDetails = {
          studentName: `${student.name} ${student.surname}`,
          tutorName: `${tutor.name} ${tutor.surname}`,
          subject: bookingData.subject,
          date: bookingData.date,
          time: bookingData.time,
          duration: `${bookingData.duration} minutes`,
        };

        // Send email to student
        const studentEmailSent = await emailService.sendBookingConfirmationEmail(
          studentUser.email,
          bookingDetails,
          'student'
        );
        if (studentEmailSent) {
          console.log(`Booking confirmation email sent to student: ${studentUser.email}`);
        } else {
          console.log(`Failed to send booking confirmation email to student: ${studentUser.email}`);
        }

        // Send email to tutor
        const tutorEmailSent = await emailService.sendBookingConfirmationEmail(
          tutorUser.email,
          bookingDetails,
          'tutor'
        );
        if (tutorEmailSent) {
          console.log(`Booking confirmation email sent to tutor: ${tutorUser.email}`);
        } else {
          console.log(`Failed to send booking confirmation email to tutor: ${tutorUser.email}`);
        }
      } catch (error) {
        console.error("Error sending booking confirmation emails:", error);
        // Continue with booking creation even if emails fail
      }

      // Return booking with populated details
      const bookingWithDetails = await this.getBookingWithDetails(savedBooking._id.toString());
      if (!bookingWithDetails) {
        throw new Error("Failed to retrieve booking details");
      }
      return bookingWithDetails;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  },

  async checkAvailability(tutorId: string, date: string, time: string, duration: number = 60, studentId?: string): Promise<BookingDoc | null> {
    try {
      // Parse the requested time
      const [requestedHour, requestedMinute] = time.split(':').map(Number);
      const requestedStartMinutes = requestedHour * 60 + requestedMinute;
      const requestedEndMinutes = requestedStartMinutes + duration;

      // Get all existing bookings for this tutor on this date
      const existingBookings = await BookingModel.find({
        tutorId: new Types.ObjectId(tutorId),
        date: date,
        status: { $in: ["pending", "confirmed"] }
      }).lean();

      // Check for tutor time conflicts
      for (const booking of existingBookings) {
        const [existingHour, existingMinute] = booking.time.split(':').map(Number);
        const existingStartMinutes = existingHour * 60 + existingMinute;
        const existingEndMinutes = existingStartMinutes + booking.duration;

        // Check if there's any overlap
        // New booking starts before existing booking ends AND new booking ends after existing booking starts
        if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
          console.log(`Time conflict detected: Existing booking ${booking.time} (${booking.duration}min) conflicts with requested ${time} (${duration}min)`);
          return booking; // Return the conflicting booking
        }
      }

      // Also check for student conflicts if studentId is provided
      if (studentId) {
        const studentBookings = await BookingModel.find({
          studentId: new Types.ObjectId(studentId),
          date: date,
          status: { $in: ["pending", "confirmed"] }
        }).lean();

        for (const booking of studentBookings) {
          const [existingHour, existingMinute] = booking.time.split(':').map(Number);
          const existingStartMinutes = existingHour * 60 + existingMinute;
          const existingEndMinutes = existingStartMinutes + booking.duration;

          // Check if there's any overlap
          if (requestedStartMinutes < existingEndMinutes && requestedEndMinutes > existingStartMinutes) {
            console.log(`Student conflict detected: Student already has booking ${booking.time} (${booking.duration}min) conflicts with requested ${time} (${duration}min)`);
            return booking; // Return the conflicting booking
          }
        }
      }

      return null; // No conflicts found
    } catch (error) {
      console.error("Error checking availability:", error);
      throw error;
    }
  },

  async getById(id: string): Promise<BookingWithDetails | null> {
    try {
      return await this.getBookingWithDetails(id);
    } catch (error) {
      console.error("Error getting booking:", error);
      throw error;
    }
  },

  async getByStudent(studentId: string): Promise<BookingWithDetails[]> {
    try {
      // First, auto-reject any expired pending bookings
      await this.autoRejectExpiredBookings();
      
      // Get bookings excluding rejected ones
      const bookings = await BookingModel.find({ 
        studentId: new Types.ObjectId(studentId),
        status: { $ne: 'rejected' }
      })
        .sort({ createdAt: -1 })
        .lean();

      const bookingsWithDetails = await Promise.all(
        bookings.map(booking => this.getBookingWithDetails(booking._id.toString()))
      );

      return bookingsWithDetails.filter(booking => booking !== null) as BookingWithDetails[];
    } catch (error) {
      console.error("Error getting student bookings:", error);
      throw error;
    }
  },

  async getByTutor(tutorId: string): Promise<BookingWithDetails[]> {
    try {
      // First, auto-reject any expired pending bookings
      await this.autoRejectExpiredBookings();
      
      // Get bookings excluding rejected ones
      const bookings = await BookingModel.find({ 
        tutorId: new Types.ObjectId(tutorId),
        status: { $ne: 'rejected' }
      })
        .sort({ createdAt: -1 })
        .lean();

      const bookingsWithDetails = await Promise.all(
        bookings.map(booking => this.getBookingWithDetails(booking._id.toString()))
      );

      return bookingsWithDetails.filter(booking => booking !== null) as BookingWithDetails[];
    } catch (error) {
      console.error("Error getting tutor bookings:", error);
      throw error;
    }
  },

  async updateStatus(id: string, status: "confirmed" | "cancelled" | "completed" | "rejected", user: any): Promise<BookingWithDetails | null> {
    try {
      const booking = await BookingModel.findById(id);
      if (!booking) {
        throw new HttpException(404, "Booking not found");
      }

      // Check authorization - tutors can update status, students can only cancel
      if (user.role === 'tutor') {
        const tutor = await TutorModel.findByUserId(user.id);
        if (!tutor || booking.tutorId.toString() !== tutor._id.toString()) {
          throw new HttpException(403, "You are not authorized to update this booking.");
        }
      } else if (user.role === 'student') {
        // Students can only cancel their own bookings
        if (status !== 'cancelled') {
          throw new HttpException(403, "Students can only cancel bookings, not update status.");
        }
        const student = await StudentModel.findById(booking.studentId);
        if (!student || student.userId.toString() !== user.id) {
          throw new HttpException(403, "You are not authorized to cancel this booking.");
        }
        
        // If student cancels a pending booking, mark it as rejected instead
        if (booking.status === 'pending') {
          status = 'rejected';
          booking.rejectionReason = 'Cancelled by student';
        }
      } else {
        throw new HttpException(403, "You are not authorized to update this booking.");
      }

      // Validate status transitions
      if (status === "confirmed" && booking.status !== 'pending') {
        throw new HttpException(400, "Only pending bookings can be confirmed.");
      }
      if (status === "completed" && booking.status !== 'confirmed') {
        throw new HttpException(400, "Only confirmed bookings can be completed.");
      }

      // Update status and timestamp
      booking.status = status;
      if (status === "confirmed") {
        booking.confirmedAt = new Date();
      } else if (status === "cancelled") {
        booking.cancelledAt = new Date();
      } else if (status === "completed") {
        booking.completedAt = new Date();
      } else if (status === "rejected") {
        booking.rejectedAt = new Date();
      }

      await booking.save();

      // Send status update message
      await this.sendStatusUpdateMessage(booking, status);

      return this.getBookingWithDetails(id);
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  },

  async delete(id: string, user: any): Promise<void> {
    try {
      const booking = await BookingModel.findById(id);
      if (!booking) {
        throw new HttpException(404, "Booking not found");
      }

      // Check authorization - only the tutor assigned to this booking can delete it
      const tutor = await TutorModel.findByUserId(user.id);
      if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
        throw new HttpException(403, "You are not authorized to delete this booking.");
      }

      // Only allow deletion of pending bookings
      if (booking.status !== 'pending') {
        throw new HttpException(400, "Only pending bookings can be deleted.");
      }

      await BookingModel.findByIdAndDelete(id);
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  },

  validateBookingDate(date: string): void {
    const bookingDate = new Date(date);
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Reset time part for accurate date comparison
    bookingDate.setHours(0, 0, 0, 0);
    oneWeekFromNow.setHours(0, 0, 0, 0);

    if (bookingDate < oneWeekFromNow) {
      throw new Error("Booking must be made at least one week in advance.");
    }
  },

  validateBookingTime(time: string): void {
    const [hour, minute] = time.split(':').map(Number);
    const requestedTime = hour * 60 + minute;

    const startTime = 8 * 60; // 08:00
    const endTime = 17 * 60; // 17:00

    if (requestedTime < startTime || requestedTime > endTime) {
      throw new Error("Bookings can only be made between 08:00 and 17:00.");
    }
  },

  // Helper methods
  async getBookingWithDetails(bookingId: string): Promise<BookingWithDetails | null> {
    try {
      const booking = await BookingModel.findById(bookingId).lean();
      if (!booking) {
        return null;
      }

      // Get student details
      const student = await StudentModel.findById(booking.studentId).lean();
      const studentUser = student ? await UserModel.findById(student.userId).lean() : null;

      // Get tutor details
      const tutor = await TutorModel.findById(booking.tutorId).lean();
      const tutorUser = tutor ? await UserModel.findById(tutor.userId).lean() : null;

      if (!student || !tutor || !studentUser || !tutorUser) {
        throw new Error("Associated user details not found");
      }

      return {
        ...booking,
        id: booking._id.toString(),
        student: {
          id: student._id.toString(),
          name: student.name,
          surname: student.surname,
          email: studentUser.email,
        },
        tutor: {
          id: tutor._id.toString(),
          userId: tutor.userId.toString(),
          name: tutor.name,
          surname: tutor.surname,
          email: tutorUser.email,
        },
      } as BookingWithDetails;
    } catch (error) {
      console.error("Error getting booking with details:", error);
      throw error;
    }
  },

  // Auto-reject expired pending bookings
  async autoRejectExpiredBookings(): Promise<number> {
    try {
      const now = new Date();
      
      // Find all pending bookings where the booking time has passed
      const expiredBookings = await BookingModel.find({
        status: 'pending',
        $expr: {
          $lt: [
            {
              $dateAdd: {
                startDate: { $dateFromString: { dateString: { $concat: ["$date", "T", "$time"] } } },
                unit: "minute",
                amount: "$duration"
              }
            },
            now
          ]
        }
      });

      let rejectedCount = 0;

      for (const booking of expiredBookings) {
        // Mark as rejected
        booking.status = 'rejected';
        booking.rejectedAt = new Date();
        booking.rejectionReason = 'Automatically rejected - booking time has passed';
        await booking.save();

        // Send notification message
        await this.sendStatusUpdateMessage(booking, "rejected");

        rejectedCount++;
      }

      if (rejectedCount > 0) {
        console.log(`Auto-rejected ${rejectedCount} expired pending bookings`);
      }

      return rejectedCount;
    } catch (error) {
      console.error("Error auto-rejecting expired bookings:", error);
      throw error;
    }
  },

  createBookingMessage(booking: BookingDoc, type: "booking_created" | "booking_confirmed" | "booking_cancelled" | "booking_rejected"): string {
    const date = new Date(booking.date);
    const formattedDate = date.toLocaleDateString();
    
    switch (type) {
      case "booking_created":
        return `📅 New booking request: ${booking.subject} session on ${formattedDate} at ${booking.time} (${booking.duration} minutes)${booking.notes ? `\n\nNotes: ${booking.notes}` : ""}`;
      case "booking_confirmed":
        return `✅ Booking confirmed: ${booking.subject} session on ${formattedDate} at ${booking.time} (${booking.duration} minutes)`;
      case "booking_cancelled":
        return `❌ Booking cancelled: ${booking.subject} session on ${formattedDate} at ${booking.time}`;
      case "booking_rejected":
        return `🚫 Booking rejected: ${booking.subject} session on ${formattedDate} at ${booking.time} - Booking time has passed`;
      default:
        return `Booking update: ${booking.subject} session on ${formattedDate} at ${booking.time}`;
    }
  },

  async sendStatusUpdateMessage(booking: BookingDoc, status: "confirmed" | "cancelled" | "completed" | "rejected"): Promise<void> {
    try {
      // Get user details for messaging
      const student = await StudentModel.findById(booking.studentId).lean();
      const tutor = await TutorModel.findById(booking.tutorId).lean();
      
      if (!student || !tutor) {
        throw new Error("Student or tutor not found");
      }

      const studentUser = await UserModel.findById(student.userId).lean();
      const tutorUser = await UserModel.findById(tutor.userId).lean();

      if (!studentUser || !tutorUser) {
        throw new Error("User details not found");
      }

      const chatId = [studentUser._id.toString(), tutorUser._id.toString()].sort().join("-");
      const messageContent = this.createBookingMessage(booking, `booking_${status}` as any);
      
      // Determine sender based on who initiated the status change
      // For now, we'll assume the tutor confirms/cancels, student completes
      const senderId = status === "completed" ? studentUser._id.toString() : tutorUser._id.toString();
      const receiverId = status === "completed" ? tutorUser._id.toString() : studentUser._id.toString();

      await ChatService.send({
        senderId,
        receiverId,
        chatId,
        content: messageContent,
        messageType: `booking_${status}`,
        bookingId: booking._id.toString(),
      });
    } catch (error) {
      console.error("Error sending status update message:", error);
      // Don't throw here as the booking update should still succeed
    }
  },

  async acceptBooking(bookingId: string, user: any): Promise<BookingWithDetails> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorModel.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "You are not authorized to accept this booking.");
    }

    if (booking.status !== 'pending') {
      throw new HttpException(400, "This booking is not pending and cannot be accepted.");
    }

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    // Send confirmation message
    await this.sendStatusUpdateMessage(booking, "confirmed");

    const bookingWithDetails = await this.getBookingWithDetails(bookingId);
    if (!bookingWithDetails) {
      throw new HttpException(500, "Failed to retrieve booking details after acceptance");
    }
    return bookingWithDetails;
  },

  async rejectBooking(bookingId: string, user: any): Promise<void> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorModel.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "You are not authorized to reject this booking.");
    }

    if (booking.status !== 'pending') {
      throw new HttpException(400, "This booking is not pending and cannot be rejected.");
    }

    // Send rejection message before deleting
    await this.sendStatusUpdateMessage(booking, "cancelled");
    
    await BookingModel.findByIdAndDelete(bookingId);
  },

  async completeBooking(bookingId: string, user: any): Promise<BookingWithDetails> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorModel.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "Only tutors can complete a booking.");
    }

    if (booking.status !== 'confirmed') {
      throw new HttpException(400, "Only confirmed bookings can be marked as complete.");
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    // Send completion message
    await this.sendStatusUpdateMessage(booking, "completed");

    const bookingWithDetails = await this.getBookingWithDetails(bookingId);
    if (!bookingWithDetails) {
      throw new HttpException(500, "Failed to retrieve booking details after completion");
    }
    return bookingWithDetails;
  },
};
