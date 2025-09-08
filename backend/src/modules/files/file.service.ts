import { FileRepo } from "./file.repo";
import type { FileDoc } from "../../schemas/tutorUpload.schema";
import mime from "mime-types";

export const FileService = {
  async create(
    input: Partial<FileDoc> & {
      file: { buffer: Buffer; originalname: string };
    },
  ) {
    if (!input.tutorId) throw new Error("tutorId is required");
    if (!input.subject) throw new Error("subject is required");
    if (!input.subtopic) throw new Error("subtopic is required");
    if (!input.title) throw new Error("title is required");
    if (!input.description) throw new Error("description is required");
    if (!input.file) throw new Error("file is required");

    const contentType =
      mime.lookup(input.file.originalname) || "application/octet-stream";

    const fileData = {
      ...input,
      content: input.file.buffer,
      contentType,
    };

    return FileRepo.create(fileData);
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
