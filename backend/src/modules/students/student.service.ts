import { StudentRepo } from "./student.repo";
import { CacheService } from "../../services/cache.service";
import type { StudentDoc } from "../../schemas/students.schema";

const STUDENT_BY_USER_CACHE_KEY = (userId: string) => `student:user:${userId}`;

export const StudentService = {
  /**
   * Fetches a student profile by user ID, utilizing a cache-aside strategy.
   */
  async byUser(userId: string): Promise<StudentDoc | null> {
    const cacheKey = STUDENT_BY_USER_CACHE_KEY(userId);
    // Removed verbose timing logs
    const cachedStudent = await CacheService.get<StudentDoc>(cacheKey);

    if (cachedStudent) {
      // Re-hydrate the plain object from cache into a full Mongoose document
      // to ensure methods and virtuals are available.
      return StudentRepo.hydrate(cachedStudent);
    }

    // Removed verbose timing logs
    const student = await StudentRepo.findOne({ userId });

    if (student) {
      // Convert to a plain object before caching to ensure clean serialization.
      await CacheService.set(cacheKey, student.toObject(), 1800); // 30 minute TTL
    }

    return student;
  },

  /**
   * Invalidates the cache for a specific student profile.
   */
  async invalidateCache(userId: string) {
    const cacheKey = STUDENT_BY_USER_CACHE_KEY(userId);
    await CacheService.del(cacheKey);
    console.log(`[Cache] Invalidated student cache for userId: ${userId}`);
  },
};
