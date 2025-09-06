import { StudentRepo } from "../students/students.repo";
import type { StudentDoc } from "../../schemas/students.schema";

export const StudentService = {
  create(input: Partial<StudentDoc>) {
    // minimal guard: require userId, name, surname (schema also enforces)
    if (!input.userId) throw new Error("userId is required");
    if (!input.name) throw new Error("name is required");
    if (!input.surname) throw new Error("surname is required");
    return StudentRepo.create(input);
  },

  list() {
    return StudentRepo.find({});
  },

  get(id: string) {
    return StudentRepo.findById(id);
  },

  getByUser(userId: string) {
    return StudentRepo.findByUserId(userId);
  },

  update(id: string, patch: Partial<StudentDoc>) {
    return StudentRepo.updateById(id, { $set: patch });
  },

  enroll(id: string, courseCode: string) {
    return StudentRepo.enroll(id, courseCode);
  },

  unenroll(id: string, courseCode: string) {
    return StudentRepo.unenroll(id, courseCode);
  },

  remove(id: string) {
    return StudentRepo.deleteById(id);
  },
};
