import { SubscriptionRepo } from "./subscription.repo";
import { StudentService } from "../students/student.service";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";
import { UserRepo } from "../users/user.repo";
import { CacheService } from "../../services/cache.service";
import { ChatService } from "../chat/chat.service";
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

    // Create a conversation between the student and tutor
    try {
      await ChatService.createConversation(student.userId.toString(), tutor.userId.toString());
    } catch (error) {
      console.error("Error creating conversation:", error);
      // Don't fail the subscription if conversation creation fails
    }

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

    const formattedTutors = tutors.map((tutor) => {
      if (!tutor) return null;
      const { pfp, ...rest } = tutor.toObject ? tutor.toObject() : tutor;
      return rest;
    }).filter(Boolean);

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

  async getSubscribedStudents(tutorId: string) {
    try {
      console.log(`Getting subscribed students for tutorId: ${tutorId}`);
      
      const tutor = await TutorRepo.findById(tutorId);
      if (!tutor) {
        console.log(`Tutor not found for tutorId: ${tutorId}`);
        const err = new Error("Tutor profile not found");
        err.name = "NotFound";
        throw err;
      }
      
      console.log(`Found tutor: ${tutor._id}`);
      
      const subscriptions = await SubscriptionRepo.findByTutorId(
        tutor._id.toString(),
      );
      
      console.log(`Found ${subscriptions.length} subscriptions`);

      // Fetch full student details
      const studentDetailsPromises = subscriptions.map(async (sub) => {
        try {
          console.log(`Fetching student for sub.studentId: ${sub.studentId.toString()}`);
          const student = await StudentRepo.findById(sub.studentId.toString());
          if (student) {
            console.log(`Found student: ${student._id}`);
            console.log(`Fetching user for student.userId: ${student.userId.toString()}`);
            const user = await UserRepo.findById(student.userId.toString());
            if (!user) {
              console.warn(`User not found for student.userId: ${student.userId.toString()}`);
            }
            return {
              _id: student._id.toString(),
              userId: student.userId.toString(),
              name: student.name,
              surname: student.surname,
              email: user?.email,
              pfp: student.pfp?.data
                ? {
                    contentType: student.pfp.contentType,
                    data: student.pfp.data.toString("base64"),
                  }
                : undefined,
            };
          }
          console.warn(`Student not found for sub.studentId: ${sub.studentId.toString()}`);
          return null;
        } catch (error) {
          console.error(`Error fetching student details for sub.studentId: ${sub.studentId.toString()}`, error);
          return null;
        }
      });

      const students = (await Promise.all(studentDetailsPromises)).filter(Boolean);
      console.log(`Returning ${students.length} students`);
      return students;
    } catch (error) {
      console.error(`Error in getSubscribedStudents for tutorId: ${tutorId}`, error);
      throw error;
    }
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

    if (result.deletedCount > 0) {
      try {
        await ChatService.deleteConversation(
          student.userId.toString(),
          tutor.userId.toString(),
        );
      } catch (error) {
        // Log the error but don't let it fail the unsubscribe operation
        console.error(
          `Failed to delete conversation for student ${student.userId} and tutor ${tutor.userId}`,
          error,
        );
      }
    }

    // Invalidate the student's subscribed tutors list
    await CacheService.del(SUBSCRIBED_TUTORS_CACHE_KEY(student._id.toString()));

    // Also invalidate the individual tutor's cache entry
    await CacheService.del(TUTOR_CACHE_KEY(tutorId));

    return result;
  },
};
