import { SubscriptionRepo } from "./subscription.repo";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";
import { CacheService } from "../../services/cache.service";

const SUBSCRIBED_TUTORS_CACHE_KEY = (studentId: string) =>
  `subscriptions:student:${studentId}`;

// Helper to format PFP and remove binary data before caching
const formatTutorForCache = (tutor: any) => {
  if (!tutor) return null;
  const formatted = { ...tutor };
  if (tutor.pfp && tutor.pfp.data instanceof Buffer) {
    formatted.pfp = {
      contentType: tutor.pfp.contentType,
      data: tutor.pfp.data.toString("base64"),
    };
  }
  return formatted;
};

export const SubscriptionService = {
  async createSubscription(
    user: { id: string; role: string },
    tutorId: string,
  ) {
    const student = await StudentRepo.findOne({ userId: user.id });
    if (!student) {
      const err = new Error("Student profile not found");
      err.name = "NotFound";
      throw err;
    }

    const tutor = await TutorRepo.findById(tutorId);
    if (!tutor) {
      const err = new Error("Tutor not found");
      err.name = "NotFound";
      throw err;
    }

    const existingSubscription = await SubscriptionRepo.findOne({
      studentId: student._id,
      tutorId: tutor._id,
    });

    if (existingSubscription) {
      const err = new Error("Already subscribed to this tutor");
      err.name = "Conflict";
      throw err;
    }

    const result = await SubscriptionRepo.create({
      studentId: student._id,
      tutorId: tutor._id,
    });

    // Invalidate the student's subscribed tutors list
    await CacheService.del(SUBSCRIBED_TUTORS_CACHE_KEY(student._id.toString()));

    return result;
  },

  async getSubscribedTutors(studentUserId: string) {
    const student = await StudentRepo.findOne({ userId: studentUserId });
    if (!student) {
      const err = new Error("Student profile not found");
      err.name = "NotFound";
      throw err;
    }

    const cacheKey = SUBSCRIBED_TUTORS_CACHE_KEY(student._id.toString());
    const cachedTutors = await CacheService.get<any[]>(cacheKey);
    if (cachedTutors) {
      return cachedTutors;
    }

    const tutors = await SubscriptionRepo.findByStudentId(
      student._id.toString(),
    );

    const formattedTutors = tutors.map(formatTutorForCache);

    await CacheService.set(cacheKey, formattedTutors, 1800); // 30 minute TTL

    return formattedTutors;
  },

  async getSubscribedStudents(tutorUserId: string) {
    const tutor = await TutorRepo.findOne({ userId: tutorUserId });
    if (!tutor) {
      const err = new Error("Tutor profile not found");
      err.name = "NotFound";
      throw err;
    }
    const subscriptions = await SubscriptionRepo.findByTutorId(
      tutor._id.toString(),
    );
    return subscriptions.map((sub) => sub.studentId);
  },

  async unsubscribe(user: { id: string }, tutorId: string) {
    const student = await StudentRepo.findOne({ userId: user.id });
    if (!student) {
      const err = new Error("Student profile not found");
      err.name = "NotFound";
      throw err;
    }

    const tutor = await TutorRepo.findById(tutorId);
    if (!tutor) {
      const err = new Error("Tutor not found");
      err.name = "NotFound";
      throw err;
    }

    const result = await SubscriptionRepo.deleteOne({
      studentId: student._id,
      tutorId: tutor._id,
    });

    // Invalidate the student's subscribed tutors list
    await CacheService.del(SUBSCRIBED_TUTORS_CACHE_KEY(student._id.toString()));

    return result;
  },
};
