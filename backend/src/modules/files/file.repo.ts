import { type FilterQuery, type UpdateQuery, Types } from "mongoose";
import { FileModel, type FileDoc } from "../../schemas/tutorUpload.schema";
import { createLogger } from "../../config/logger";
import { TutorModel } from "../../schemas/tutor.schema";

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
    // Validate ObjectId format before querying
    if (!Types.ObjectId.isValid(id)) {
      logger.warn(`Invalid ObjectId format: ${id}`);
      return null;
    }
    return FileModel.findById(id).lean<FileDoc | null>();
  },

  // When you need the binary
  findByIdWithContent(id: string) {
    // Validate ObjectId format before querying
    if (!Types.ObjectId.isValid(id)) {
      logger.warn(`Invalid ObjectId format: ${id}`);
      return null;
    }
    return FileModel.findById(id).select("+content");
  },

  findByTutor(tutorId: string, limit = 20, skip = 0) {
    return FileModel.find({ tutorId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<FileDoc[]>({ virtuals: true });
  },

  // Resolve tutorId by userId, then list files (meta only)
  async findByTutorUserId(userId: string, limit = 100, skip = 0) {
    // Normalize and cast userId defensively (strip angle brackets or stray chars)
    const raw = String(userId)
      .trim()
      .replace(/[<>\s]/g, "");
    let userObjectId: Types.ObjectId | null = null;
    try {
      userObjectId = new Types.ObjectId(raw);
    } catch {
      logger.warn(`Invalid userId for files.by-user: ${userId}`);
      return [] as FileDoc[];
    }

    const tutor = await TutorModel.findOne({ userId: userObjectId })
      .select({ _id: 1 })
      .lean();
    // Support legacy uploads where files.tutorId stored the User._id instead of Tutor._id
    const orConditions: any[] = [{ tutorId: userObjectId }];
    if (tutor?._id) orConditions.push({ tutorId: tutor._id });

    return FileModel.find({ $or: orConditions })
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

  async findTutorByUserId(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return TutorModel.findOne({ userId: userObjectId }).lean();
  },
};
