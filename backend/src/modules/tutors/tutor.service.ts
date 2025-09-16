import { TutorRepo } from "./tutor.repo";
import type { TutorDoc } from "../../schemas/tutor.schema";
import { CacheService } from "../../services/cache.service";

const TUTOR_CACHE_KEY = (id: string) => `tutor:${id}`;
const TUTOR_BY_USER_CACHE_KEY = (userId: string) => `tutor:user:${userId}`;

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

export const TutorService = {
  async create(input: Partial<TutorDoc>) {
    if (!input.userId) throw new Error("userId is required");
    if (!input.name) throw new Error("name is required");
    if (!input.surname) throw new Error("surname is required");
    if (!input.subjects || input.subjects.length === 0)
      throw new Error("subjects required");

    // No need to invalidate tutors:all anymore
    return TutorRepo.create(input);
  },

  async list() {
    // Caching for the main list has been removed for robustness and user-specific filtering.
    // The aggregation will run on every request to ensure correctness.
    const tutors = await TutorRepo.findAllWithStudentCount();
    const formattedTutors = tutors.map(formatTutorForCache);

    // Proactively update the cache for each individual tutor.
    // This warms the cache so that subsequent detail views are fast.
    if (formattedTutors.length > 0) {
      const promises = formattedTutors.map((tutor) => {
        if (tutor && tutor.id) {
          const cacheKey = TUTOR_CACHE_KEY(tutor.id.toString());
          return CacheService.set(cacheKey, tutor, 1800); // 30 minute TTL
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
    }

    return formattedTutors;
  },

  async get(id: string) {
    const cacheKey = TUTOR_CACHE_KEY(id);
    const cachedTutor = await CacheService.get(cacheKey);
    if (cachedTutor) return cachedTutor;

    const tutor = await TutorRepo.findById(id);
    if (tutor) {
      const formattedTutor = formatTutorForCache(tutor.toObject());
      await CacheService.set(cacheKey, formattedTutor, 1800); // 30 minute TTL
      return formattedTutor;
    }
    return null;
  },

  async byUser(userId: string) {
    const cacheKey = TUTOR_BY_USER_CACHE_KEY(userId);
    const cachedTutor = await CacheService.get(cacheKey);
    if (cachedTutor) return cachedTutor;

    const tutor = await TutorRepo.findByUserId(userId);
    if (tutor) {
      const formattedTutor = formatTutorForCache(tutor.toObject());
      await CacheService.set(cacheKey, formattedTutor, 1800); // 30 minute TTL
      return formattedTutor;
    }
    return null;
  },

  searchSubject(q: string) {
    return TutorRepo.searchBySubject(q);
  },

  async update(id: string, patch: Partial<TutorDoc>) {
    const updatedTutor = await TutorRepo.updateById(id, { $set: patch });
    if (updatedTutor) {
      // Invalidate only the specific tutor caches
      await CacheService.del([
        TUTOR_CACHE_KEY(id),
        TUTOR_BY_USER_CACHE_KEY(updatedTutor.userId.toString()),
      ]);
    }
    return updatedTutor;
  },

  async rate(id: string, score: number) {
    if (score < 0 || score > 5) throw new Error("score must be 0..5");
    const ratedTutor = await TutorRepo.applyRating(id, score);
    if (ratedTutor) {
      await CacheService.del([
        TUTOR_CACHE_KEY(ratedTutor._id.toString()),
        TUTOR_BY_USER_CACHE_KEY(ratedTutor.userId.toString()),
      ]);
    }
    return ratedTutor;
  },

  async remove(id: string) {
    const deletedTutor = await TutorRepo.deleteById(id);
    if (deletedTutor) {
      await CacheService.del([
        TUTOR_CACHE_KEY(id),
        TUTOR_BY_USER_CACHE_KEY(deletedTutor.userId.toString()),
      ]);
    }
    return deletedTutor;
  },
};
