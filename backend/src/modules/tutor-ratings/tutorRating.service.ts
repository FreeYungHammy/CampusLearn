import { TutorRatingModel } from "../../schemas/tutorRating.schema";
import { SubscriptionModel } from "../../schemas/subscription.schema";
import { BookingModel } from "../../schemas/booking.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { StudentModel } from "../../schemas/students.schema";
import { Types } from "mongoose";

export interface RateTutorRequest {
  studentId: string;
  tutorId: string;
  rating: number;
}

export const TutorRatingService = {
  async rateTutor(data: RateTutorRequest) {
    const { studentId, tutorId, rating } = data;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if student exists
    const student = await StudentModel.findById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    // Check if tutor exists
    const tutor = await TutorModel.findById(tutorId);
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    // Check if student is subscribed to tutor
    const subscription = await SubscriptionModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    if (!subscription) {
      throw new Error("You must be subscribed to this tutor to rate them");
    }

    // Check if student has at least one booking with the tutor
    const booking = await BookingModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    if (!booking) {
      throw new Error("You must have at least one booking with this tutor to rate them");
    }

    // Check if rating already exists
    const existingRating = await TutorRatingModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    let tutorRating;
    let ratingChange = 0;

    if (existingRating) {
      // Update existing rating
      const oldRating = existingRating.rating;
      existingRating.rating = rating;
      tutorRating = await existingRating.save();
      ratingChange = rating - oldRating;
    } else {
      // Create new rating
      tutorRating = await TutorRatingModel.create({
        studentId: new Types.ObjectId(studentId),
        tutorId: new Types.ObjectId(tutorId),
        rating,
      });
      ratingChange = rating;
    }

    // Update tutor's aggregate rating
    if (ratingChange !== 0) {
      await TutorModel.findByIdAndUpdate(tutorId, {
        $inc: {
          "rating.totalScore": ratingChange,
          "rating.count": existingRating ? 0 : 1,
        },
      });
    }

    return tutorRating;
  },

  async getStudentRating(studentId: string, tutorId: string) {
    const rating = await TutorRatingModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    return rating;
  },

  async getTutorRatings(tutorId: string) {
    const ratings = await TutorRatingModel.find({
      tutorId: new Types.ObjectId(tutorId),
    }).populate("studentId", "userId").lean();

    return ratings;
  },

  async canStudentRate(studentId: string, tutorId: string) {
    // Check subscription
    const subscription = await SubscriptionModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    if (!subscription) {
      return { canRate: false, reason: "Not subscribed to this tutor" };
    }

    // Check booking
    const booking = await BookingModel.findOne({
      studentId: new Types.ObjectId(studentId),
      tutorId: new Types.ObjectId(tutorId),
    });

    if (!booking) {
      return { canRate: false, reason: "No bookings with this tutor" };
    }

    return { canRate: true };
  },
};
