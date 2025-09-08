import { type FilterQuery, type UpdateQuery } from "mongoose";
import { FileModel, type FileDoc } from "../../schemas/tutorUpload.schema";
import { createLogger } from "../../config/logger";

const logger = createLogger("FileRepo");

export const FileRepo = {
  // CREATE
  async create(data: Partial<FileDoc>) {
    logger.info("Attempting to save file document to MongoDB...");
    try {
      const result = await FileModel.create(data);
      logger.info("File document saved successfully to MongoDB.");
      return result;
    } catch (e) {
      logger.error("Failed to save file document to MongoDB.", e);
      throw e; // Re-throw the error
    }
  },

  // READ (meta only by default, because content is select:false)
  find(filter: FilterQuery<FileDoc> = {}, limit = 20, skip = 0) {
    return FileModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<FileDoc[]>();
  },

  findById(id: string) {
    return FileModel.findById(id).lean<FileDoc | null>();
  },

  // When you need the binary
  findByIdWithContent(id: string) {
    return FileModel.findById(id)
      .select("+content")
      .lean<FileDoc | null>({ virtuals: true });
  },

  findByTutor(tutorId: string, limit = 20, skip = 0) {
    return FileModel.find({ tutorId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<FileDoc[]>({ virtuals: true });
  },

  // UPDATE
  updateById(id: string, update: UpdateQuery<FileDoc>) {
    return FileModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean<FileDoc | null>();
  },

  // DELETE
  deleteById(id: string) {
    return FileModel.findByIdAndDelete(id).lean<FileDoc | null>({
      virtuals: true,
    });
  },

  // Count / exists helpers
  count(filter: FilterQuery<FileDoc> = {}) {
    return FileModel.countDocuments(filter);
  },
  exists(filter: FilterQuery<FileDoc>) {
    return FileModel.exists(filter).lean();
  },
};
