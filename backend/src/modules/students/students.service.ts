import { StudentRepo } from "../students/students.repo";
import type { StudentDoc } from "../../schemas/students.schema";
import { CacheService } from "../../services/cache.service";

const STUDENT_CACHE_KEY = (id: string) => `student:${id}`;
const STUDENT_BY_USER_CACHE_KEY = (userId: string) => `student:user:${userId}`;

// Helper to strip PFP before caching
const stripPfp = (student: any) => {
  if (!student) return null;
  const { pfp, ...rest } = student;
  return rest;
};

export const StudentService = {
  async create(input: Partial<StudentDoc>) {
    if (!input.userId) throw new Error("userId is required");
    if (!input.name) throw new Error("name is required");
    if (!input.surname) throw new Error("surname is required");
    // No invalidation needed on create, as it doesn't affect lists and is a new entry
    return StudentRepo.create(input);
  },

  list() {
    // Not caching the full student list as per ADR (can be very large)
    return StudentRepo.find({});
  },

  async get(id: string) {
    const cacheKey = STUDENT_CACHE_KEY(id);
    const cachedStudent = await CacheService.get(cacheKey);
    if (cachedStudent) return cachedStudent;

    const student = await StudentRepo.findById(id);
    if (student) {
      await CacheService.set(cacheKey, stripPfp(student), 1800);
    }
    return student;
  },

  async getByUser(userId: string) {
    const cacheKey = STUDENT_BY_USER_CACHE_KEY(userId);
    const cachedStudent = await CacheService.get(cacheKey);
    if (cachedStudent) return cachedStudent;

    const student = await StudentRepo.findByUserId(userId);
    if (student) {
      await CacheService.set(cacheKey, stripPfp(student), 1800);
    }
    return student;
  },

  async update(id: string, patch: Partial<StudentDoc>) {
    const updatedStudent = await StudentRepo.updateById(id, { $set: patch });
    if (updatedStudent) {
      await CacheService.del([
        STUDENT_CACHE_KEY(id),
        STUDENT_BY_USER_CACHE_KEY(updatedStudent.userId.toString()),
      ]);
    }
    return updatedStudent;
  },

  async enroll(id: string, courseCode: string) {
    const updatedStudent = await StudentRepo.enroll(id, courseCode);
    if (updatedStudent) {
      await CacheService.del([
        STUDENT_CACHE_KEY(id),
        STUDENT_BY_USER_CACHE_KEY(updatedStudent.userId.toString()),
      ]);
    }
    return updatedStudent;
  },

  async unenroll(id: string, courseCode: string) {
    const updatedStudent = await StudentRepo.unenroll(id, courseCode);
    if (updatedStudent) {
      await CacheService.del([
        STUDENT_CACHE_KEY(id),
        STUDENT_BY_USER_CACHE_KEY(updatedStudent.userId.toString()),
      ]);
    }
    return updatedStudent;
  },

  async remove(id: string) {
    const deletedStudent = await StudentRepo.deleteById(id);
    if (deletedStudent) {
      await CacheService.del([
        STUDENT_CACHE_KEY(id),
        STUDENT_BY_USER_CACHE_KEY(deletedStudent.userId.toString()),
      ]);
    }
    return deletedStudent;
  },
};
