import { SubscriptionRepo } from "./subscription.repo";
import { StudentRepo } from "../students/student.repo";
import { TutorRepo } from "../tutors/tutor.repo";

export const SubscriptionService = {
  async createSubscription(
    user: { id: string; role: string },
    tutorId: string,
  ) {
    // 1. Find the student profile from the user id
    const student = await StudentRepo.findOne({ userId: user.id });
    if (!student) {
      const err = new Error("Student profile not found");
      err.name = "NotFound";
      throw err;
    }

    // 2. Verify the tutor exists
    const tutor = await TutorRepo.findById(tutorId);
    if (!tutor) {
      const err = new Error("Tutor not found");
      err.name = "NotFound";
      throw err;
    }

    // 3. Check if subscription already exists
    const existingSubscription = await SubscriptionRepo.findOne({
      studentId: student._id,
      tutorId: tutor._id,
    });

    if (existingSubscription) {
      const err = new Error("Already subscribed to this tutor");
      err.name = "Conflict";
      throw err;
    }

    // 4. Create subscription
    return SubscriptionRepo.create({
      studentId: student._id,
      tutorId: tutor._id,
    });
  },

  async getSubscribedTutors(studentUserId: string) {
    const student = await StudentRepo.findOne({ userId: studentUserId });
    if (!student) {
      const err = new Error("Student profile not found");
      err.name = "NotFound";
      throw err;
    }
    const tutors = await SubscriptionRepo.findByStudentId(
      student._id.toString(),
    );
    return tutors.map((tutor) => {
      const transformedTutor = {
        ...tutor,
        pfp: tutor.pfp
          ? {
              contentType: tutor.pfp.contentType,
              data: tutor.pfp.data.buffer.toString("base64"),
            }
          : undefined,
      };
      return transformedTutor;
    });
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
    // The repo already populates the studentId field
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

    return SubscriptionRepo.deleteOne({
      studentId: student._id,
      tutorId: tutor._id,
    });
  },
};
