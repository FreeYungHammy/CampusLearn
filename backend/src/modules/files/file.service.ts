import { FileRepo } from "./file.repo";
import type { FileDoc } from "../../schemas/tutorUpload.schema";

export const FileService = {
  create(input: Partial<FileDoc>) {
    if (!input.tutorId) throw new Error("tutorId is required");
    if (!input.subject) throw new Error("subject is required");
    if (!input.subtopic) throw new Error("subtopic is required");
    if (!input.title) throw new Error("title is required");
    if (!input.content) throw new Error("content (binary) is required");
    return FileRepo.create(input);
  },

  list(filter: Partial<FileDoc> = {}, limit = 20, skip = 0) {
    return FileRepo.find(filter as any, limit, skip);
  },

  getMeta(id: string) {
    // returns doc without binary (content is select:false in schema)
    return FileRepo.findById(id);
  },

  getWithBinary(id: string) {
    // explicitly include binary content
    return FileRepo.findByIdWithContent(id);
  },

  byTutor(tutorId: string, limit = 20, skip = 0) {
    return FileRepo.findByTutor(tutorId, limit, skip);
  },

  update(id: string, patch: Partial<FileDoc>) {
    return FileRepo.updateById(id, { $set: patch });
  },

  remove(id: string) {
    return FileRepo.deleteById(id);
  },
};
