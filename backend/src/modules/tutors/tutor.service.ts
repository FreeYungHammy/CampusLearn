import { TutorRepo } from "./tutor.repo";
import type { TutorDoc } from "../../schemas/tutor.schema";

export const TutorService = {
  create(input: Partial<TutorDoc>) {
    if (!input.userId) throw new Error("userId is required");
    if (!input.name) throw new Error("name is required");
    if (!input.surname) throw new Error("surname is required");
    if (!input.subjects || input.subjects.length === 0)
      throw new Error("subjects required");
    return TutorRepo.create(input);
  },

  async list() {
    const tutors = await TutorRepo.findAllWithStudentCount();
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

  get(id: string) {
    return TutorRepo.findById(id);
  },

  byUser(userId: string) {
    return TutorRepo.findByUserId(userId);
  },

  searchSubject(q: string) {
    return TutorRepo.searchBySubject(q);
  },

  update(id: string, patch: Partial<TutorDoc>) {
    return TutorRepo.updateById(id, { $set: patch });
  },

  // naive rating write; refine later if needed
  async rate(id: string, score: number) {
    if (score < 0 || score > 5) throw new Error("score must be 0..5");
    return TutorRepo.applyRating(id, score);
  },

  remove(id: string) {
    return TutorRepo.deleteById(id);
  },
};
