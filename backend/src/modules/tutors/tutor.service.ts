import { TutorRepo } from "./tutor.repo";
import type { TutorDoc } from "../../schemas/tutor.schema";
import { CacheService } from "../../services/cache.service";

export const TUTOR_CACHE_KEY = (id: string) => `tutor:${id}`;
const TUTOR_BY_USER_CACHE_KEY = (userId: string) => `tutor:user:${userId}`;

/**
 * Formats tutor data for display.
 * - Converts the PFP data buffer to a base64 string for frontend rendering.
 * - Handles the BSON Binary type that comes from aggregations.
 */
const formatTutorForDisplay = (tutor: any) => {
  if (!tutor) return null;
  const formatted = { ...tutor };

  if (tutor.pfp && tutor.pfp.data) {
    // Data from a findOne/findById query is a Buffer.
    // Data from an aggregate query is a BSON Binary object.
    // We handle both by ensuring we have a buffer, then converting to base64.
    const dataAsBuffer = tutor.pfp.data.buffer || tutor.pfp.data;

    if (dataAsBuffer.length > 0) {
      formatted.pfp = {
        contentType: tutor.pfp.contentType,
        data: Buffer.from(dataAsBuffer).toString("base64"),
      };
    } else {
      delete formatted.pfp; // Remove pfp if data is empty
    }
  } else {
    delete formatted.pfp; // Remove pfp if it exists but has no data
  }
  return formatted;
};

/**
 * Prepares a cached tutor object for hydration.
 * - Converts the base64 PFP data string back into a Buffer for Mongoose.
 */
const prepareForHydration = (cachedTutor: any) => {
  if (
    cachedTutor &&
    cachedTutor.pfp &&
    typeof cachedTutor.pfp.data === "string"
  ) {
    cachedTutor.pfp.data = Buffer.from(cachedTutor.pfp.data, "base64");
  }
  return cachedTutor;
};

export const TutorService = {
  async create(input: Partial<TutorDoc>) {
    if (!input.userId) throw new Error("userId is required");
    if (!input.name) throw new Error("name is required");
    if (!input.surname) throw new Error("surname is required");
    if (!input.subjects || input.subjects.length === 0)
      throw new Error("subjects required");

    return TutorRepo.create(input);
  },

  async list() {
    console.time("Mongo retrieval time (All Tutors)");
    const tutorsFromDb = await TutorRepo.findAllWithStudentCount();
    console.timeEnd("Mongo retrieval time (All Tutors)");

    const formattedTutors = tutorsFromDb.map((tutor) => {
      const { pfp, ...rest } = tutor;
      return rest;
    });

    return formattedTutors;
  },

  async get(id: string) {
    const cacheKey = TUTOR_CACHE_KEY(id);
    console.time(`Redis retrieval time (Tutor by ID: ${id})`);
    let cachedTutor = await CacheService.get<any>(cacheKey);
    console.timeEnd(`Redis retrieval time (Tutor by ID: ${id})`);

    if (cachedTutor) {
      // Extend TTL on cache hit to keep frequently accessed tutors in cache
      await CacheService.set(cacheKey, cachedTutor, 1800);
      cachedTutor = prepareForHydration(cachedTutor);
      return TutorRepo.hydrate(cachedTutor);
    }

    console.time(`Mongo retrieval time (Tutor by ID: ${id})`);
    const tutorFromDb = await TutorRepo.findById(id);
    console.timeEnd(`Mongo retrieval time (Tutor by ID: ${id})`);

    if (!tutorFromDb) return null;

    const formattedTutor = formatTutorForDisplay(tutorFromDb.toObject());
    await CacheService.set(cacheKey, formattedTutor, 1800);

    // Return the hydrated document for consistency
    const prepared = prepareForHydration(formattedTutor);
    return TutorRepo.hydrate(prepared);
  },

  async byUser(userId: string) {
    const cacheKey = TUTOR_BY_USER_CACHE_KEY(userId);
    console.time(`Redis retrieval time (Tutor by User: ${userId})`);
    let cachedTutor = await CacheService.get<any>(cacheKey);
    console.timeEnd(`Redis retrieval time (Tutor by User: ${userId})`);

    if (cachedTutor) {
      // Extend TTL on cache hit to keep frequently accessed tutors in cache
      await CacheService.set(cacheKey, cachedTutor, 1800);
      cachedTutor = prepareForHydration(cachedTutor);
      return TutorRepo.hydrate(cachedTutor);
    }

    console.time(`Mongo retrieval time (Tutor by User: ${userId})`);
    const tutorFromDb = await TutorRepo.findByUserId(userId);
    console.timeEnd(`Mongo retrieval time (Tutor by User: ${userId})`);

    if (!tutorFromDb) return null;

    const formattedTutor = formatTutorForDisplay(tutorFromDb.toObject());
    await CacheService.set(cacheKey, formattedTutor, 1800);

    const prepared = prepareForHydration(formattedTutor);
    return TutorRepo.hydrate(prepared);
  },

  searchSubject(q: string) {
    return TutorRepo.searchBySubject(q);
  },

  async update(id: string, patch: Partial<TutorDoc>) {
    const updatedTutor = await TutorRepo.updateById(id, { $set: patch });
    if (updatedTutor) {
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
