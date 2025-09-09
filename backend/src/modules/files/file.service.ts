import { FileRepo } from "./file.repo";
import type { FileDoc } from "../../schemas/tutorUpload.schema";
import mime from "mime-types";
import { createLogger } from "../../config/logger";

const logger = createLogger("FileService");

export const FileService = {
  async create(
    input: Partial<FileDoc> & {
      file: { buffer: Buffer; originalname: string; mimetype: string };
    },
  ) {
    logger.info("Received request to create file.");
    if (!input.tutorId) throw new Error("tutorId is required");
    if (!input.subject) throw new Error("subject is required");
    if (!input.subtopic) throw new Error("subtopic is required");
    if (!input.title) throw new Error("title is required");
    if (!input.description) throw new Error("description is required");
    if (!input.file) throw new Error("file is required");

    const contentType = input.file.mimetype || "application/octet-stream";

    const fileData = {
      ...input,
      content: input.file.buffer,
      contentType,
    };

    try {
      const result = await FileRepo.create(fileData);
      logger.info("File data sent successfully to repository.");
      return result;
    } catch (e) {
      logger.error("Failed to send file data to repository.", e);
      throw e; // Re-throw the error so the controller can handle it
    }
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

  // Find files for a tutor by the owning User's id (via Tutor profile)
  async byTutorUserId(userId: string, limit = 100, skip = 0) {
    // We can't import TutorRepo directly here to avoid a circular dep; query via repo helper
    return FileRepo.findByTutorUserId(userId, limit, skip);
  },

  update(id: string, patch: Partial<FileDoc>) {
    return FileRepo.updateById(id, { $set: patch });
  },

  remove(id: string) {
    return FileRepo.deleteById(id);
  },
};
