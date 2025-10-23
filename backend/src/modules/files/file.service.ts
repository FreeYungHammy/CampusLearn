import { FileRepo } from "./file.repo";
import type { FileDoc } from "../../schemas/tutorUpload.schema";
import mime from "mime-types";
import { createLogger } from "../../config/logger";
import zlib from "zlib";
import { promisify } from "util";
import { gcsService } from "../../services/gcs.service";
import { validateVideoSignature, validateFileSize, sanitizeFilename } from "../../utils/fileValidation";
import { env } from "../../config/env";

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

    // Validate file size
    if (!validateFileSize(input.file.buffer, env.maxFileSize)) {
      throw new Error(`File size exceeds maximum allowed size of ${env.maxFileSize / (1024 * 1024)}MB`);
    }

    // Validate content type for videos
    if (contentType.startsWith("video/")) {
      const allowedVideoTypes = ["video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm"];
      if (!allowedVideoTypes.includes(contentType)) {
        throw new Error(`Unsupported video format: ${contentType}`);
      }

      // Validate file signature for videos
      if (!validateVideoSignature(input.file.buffer, contentType)) {
        throw new Error(`Invalid video file signature for ${contentType}`);
      }
    }

    let compressedContent: Buffer | undefined;
    let externalUri: string | undefined;

    // Create base fileData object
    const fileData: any = {
      tutorId: input.tutorId,
      subject: input.subject,
      subtopic: input.subtopic,
      title: input.title,
      description: input.description,
      size: input.file.buffer.length,
      contentType,
    };

    // Only add compression fields for video files
    if (contentType.startsWith("video/")) {
      fileData.compressionStatus = "pending";
      fileData.compressedQualities = [];
    }
    // For non-video files, explicitly ensure no compression fields exist

    if (gcsService.isEnabled() && contentType.startsWith("video/")) {
      // Enhanced filename sanitization using utility
      const timestamp = Date.now();
      const sanitizedName = sanitizeFilename(input.file.originalname || "upload");
      const safeName = `${timestamp}-${sanitizedName}`;
      const destination = `uploads/videos/${safeName}`;

      // Upload original video first - try both methods
      try {
        await gcsService.uploadBuffer(
          input.file.buffer,
          contentType,
          destination,
          input.file.originalname,
        );
        externalUri = destination; // stored path in bucket
      } catch (error) {
        logger.warn(`GCS: Primary upload failed, trying alternative method:`, error);
        try {
          await gcsService.uploadBufferSimple(
            input.file.buffer,
            contentType,
            destination,
            input.file.originalname,
          );
          externalUri = destination; // stored path in bucket
        } catch (fallbackError) {
          logger.error(`GCS: Both upload methods failed:`, fallbackError);
          throw fallbackError;
        }
      }

      // Set compression status to "pending" - compression will start when video is played
      logger.info(`🎬 Video uploaded successfully: ${destination}`);
      logger.info(`🎬 Video file size: ${input.file.buffer.length} bytes`);
      logger.info(`🎬 Content type: ${contentType}`);
      logger.info(`🎬 Compression will start when video is first played`);

      // Set compression status to "pending" - not started yet
      fileData.compressionStatus = "pending";
      fileData.externalUri = externalUri;
    } else {
      // Fallback: store in Mongo as before
      logger.info(`Original size: ${input.file.buffer.length} bytes`);
      compressedContent = await gzip(input.file.buffer);
      logger.info(`Compressed size: ${compressedContent.length} bytes`);
      
      // Update fileData for non-video files
      fileData.content = compressedContent;
    }

    try {
      // For non-video files, create a clean object without compression fields
      let dataToSave = fileData;
      if (!contentType.startsWith("video/")) {
        const { compressionStatus, compressedQualities, ...cleanData } = fileData as any;
        dataToSave = cleanData;
        logger.info(`🧹 Cleaning compression fields for non-video file: ${contentType}`);
        logger.info(`📝 Data to save:`, JSON.stringify(dataToSave, null, 2));
      }
      
      const result = await FileRepo.create(dataToSave);
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

  async getMeta(id: string) {
    // returns doc without binary (content is select:false in schema)
    const fileDoc = await FileRepo.findById(id);
    if (!fileDoc) return null;
    
    // Clean up compression fields for non-video files
    if (!fileDoc.contentType.startsWith("video/")) {
      const obj = fileDoc as any;
      // Remove compression fields if they exist
      if (obj.compressionStatus !== undefined || obj.compressedQualities !== undefined) {
        await FileRepo.updateById(id, {
          $unset: {
            compressionStatus: 1,
            compressedQualities: 1
          }
        });
        // Return cleaned object
        const { compressionStatus, compressedQualities, ...cleanedObj } = obj;
        return cleanedObj;
      }
    }
    
    return fileDoc;
  },

  async getWithBinary(id: string) {
    // explicitly include binary content
    const fileDoc = await FileRepo.findByIdWithContent(id);
    if (!fileDoc) return null;

    const obj = fileDoc.toObject() as any;
    
    // Clean up compression fields for non-video files
    if (!fileDoc.contentType.startsWith("video/")) {
      if (obj.compressionStatus !== undefined || obj.compressedQualities !== undefined) {
        await FileRepo.updateById(id, {
          $unset: {
            compressionStatus: 1,
            compressedQualities: 1
          }
        });
        // Remove compression fields from the returned object
        const { compressionStatus, compressedQualities, ...cleanedObj } = obj;
        if (cleanedObj.externalUri) {
          return cleanedObj;
        }
        // Decompress the file content for legacy/local storage
        if (!fileDoc.content) {
          throw new Error("Binary content missing for file");
        }
        const decompressedContent = await gunzip(fileDoc.content as Buffer);
        return { ...cleanedObj, content: decompressedContent };
      }
    }

    // If stored in GCS, return without content and include externalUri
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

  // Find all files for a tutor (without pagination)
  async findByTutorId(tutorId: string) {
    return FileRepo.findByTutor(tutorId, 1000, 0); // Get up to 1000 files
  },

  // Find files for a tutor by the owning User's id (via Tutor profile)
  async byTutorUserId(userId: string, limit = 100, skip = 0) {
    // We can't import TutorRepo directly here to avoid a circular dep; query via repo helper
    return FileRepo.findByTutorUserId(userId, limit, skip);
  },

  update(id: string, patch: Partial<FileDoc>) {
    return FileRepo.updateById(id, { $set: patch });
  },

  async remove(id: string) {
    // Get the file first to check if it has compressed versions
    const file = await FileRepo.findById(id);

    if (file && (file as any).externalUri) {
      const objectName = String((file as any).externalUri).replace(
        /^gs:\/\//,
        "",
      );

      // Delete compressed versions if they exist
      try {
        const { VideoCompressionService } = await import(
          "../../services/video-compression.service"
        );
        await VideoCompressionService.deleteAllCompressedVersions(objectName);
        logger.info(`🗑️ Deleted compressed versions for: ${objectName}`);
      } catch (error) {
        logger.warn(
          `⚠️ Failed to delete compressed versions for ${objectName}:`,
          error,
        );
        // Continue with file deletion even if compressed version deletion fails
      }
    }

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
