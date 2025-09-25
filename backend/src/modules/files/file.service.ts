import { FileRepo } from "./file.repo";
import type { FileDoc } from "../../schemas/tutorUpload.schema";
import mime from "mime-types";
import { createLogger } from "../../config/logger";
import zlib from "zlib";
import { promisify } from "util";
import { gcsService } from "../../services/gcs.service";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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

    const contentType = input.file?.mimetype || "application/octet-stream";

    let compressedContent: Buffer | undefined;
    let externalUri: string | undefined;

    if (gcsService.isEnabled() && contentType.startsWith("video/")) {
      const safeName = `${Date.now()}-${(input.file.originalname || "upload").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const destination = `uploads/videos/${safeName}`;
      await gcsService.uploadBuffer(input.file.buffer, contentType, destination);
      externalUri = destination; // stored path in bucket
    } else {
      // Fallback: store in Mongo as before
      logger.info(`Original size: ${input.file.buffer.length} bytes`);
      compressedContent = await gzip(input.file.buffer);
      logger.info(`Compressed size: ${compressedContent.length} bytes`);
    }

    const fileData = {
      tutorId: input.tutorId,
      subject: input.subject,
      subtopic: input.subtopic,
      title: input.title,
      description: input.description,
      ...(compressedContent ? { content: compressedContent } : {}),
      contentType,
      ...(externalUri ? { externalUri } : {}),
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

  async getWithBinary(id: string) {
    // explicitly include binary content
    const fileDoc = await FileRepo.findByIdWithContent(id);
    if (!fileDoc) return null;

    // If stored in GCS, return without content and include externalUri
    const obj = fileDoc.toObject();
    if (obj.externalUri) {
      return obj;
    }

    // Decompress the file content for legacy/local storage
    if (!fileDoc.content) {
      throw new Error("Binary content missing for file");
    }
    const decompressedContent = await gunzip(fileDoc.content as Buffer);
    return { ...obj, content: decompressedContent };
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

  async isOwner(userId: string, fileTutorId: string): Promise<boolean> {
    const tutor = await FileRepo.findTutorByUserId(userId);
    if (!tutor) {
      return false;
    }
    const result =
      tutor._id.toString() === fileTutorId || userId === fileTutorId;
    return result;
  },

  findTutorByUserId(userId: string) {
    return FileRepo.findTutorByUserId(userId);
  },

  async getSignedUrlForVideo(filename: string): Promise<string> {
    if (!gcsService.isEnabled()) {
      throw new Error("GCS service is not enabled");
    }
    // Construct the full object path as it's stored in GCS
    const objectName = `uploads/videos/${filename}`;
    logger.info(`Generating signed URL for GCS object: ${objectName}`);
    return gcsService.getSignedReadUrl(objectName);
  },
};
