import { SubscriptionRepo } from "./subscription.repo";
import { StudentService } from "../students/student.service";
import { TutorRepo } from "../tutors/tutor.repo";
import { CacheService } from "../../services/cache.service";
import { TUTOR_CACHE_KEY } from "../tutors/tutor.service";

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
    const student = await StudentService.byUser(user.id);
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
    const student = await StudentService.byUser(studentUserId);
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

    // Cache the list of subscribed tutors
    await CacheService.set(cacheKey, formattedTutors, 1800); // 30 minute TTL

    // Also cache each individual tutor for faster access elsewhere
    if (formattedTutors.length > 0) {
      const promises = formattedTutors.map((tutor) => {
        if (tutor && tutor.id) {
          const individualTutorCacheKey = TUTOR_CACHE_KEY(tutor.id.toString());
          return CacheService.set(individualTutorCacheKey, tutor, 1800);
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
    }

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
    const student = await StudentService.byUser(user.id);
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

    // Also invalidate the individual tutor's cache entry
    await CacheService.del(TUTOR_CACHE_KEY(tutorId));

    return result;
  },
};
