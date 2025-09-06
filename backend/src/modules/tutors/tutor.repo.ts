import { type FilterQuery, type UpdateQuery } from "mongoose";
import { TutorModel, type TutorDoc } from "../../schemas/tutor.schema";

export const TutorRepo = {
  // CREATE
  create(data: Partial<TutorDoc>) {
    return TutorModel.create(data);
  },

  // READ
  find(filter: FilterQuery<TutorDoc> = {}, limit = 20, skip = 0) {
    return TutorModel.find(filter).limit(limit).skip(skip).lean<TutorDoc[]>();
  },

  findById(id: string) {
    return TutorModel.findById(id).lean<TutorDoc | null>();
  },

  findByUserId(userId: string) {
    return TutorModel.findOne({ userId }).lean<TutorDoc | null>();
  },

  searchBySubject(q: string, limit = 20, skip = 0) {
    return TutorModel.find({ subjects: { $regex: q, $options: "i" } })
      .limit(limit)
      .skip(skip)
      .lean<TutorDoc[]>();
  },

  // UPDATE
  updateById(id: string, update: UpdateQuery<TutorDoc>) {
    return TutorModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean<TutorDoc | null>();
  },

  // Optional atomic rating update helper
  applyRating(id: string, newScore: number) {
    // caller validates 0..5
    return TutorModel.findByIdAndUpdate(
      id,
      {
        $inc: { "rating.count": 1 },
        $set: { "rating.average": newScore }, // simple; replace with running average if needed
      },
      { new: true },
    ).lean<TutorDoc | null>();
  },

  // DELETE
  deleteById(id: string) {
    return TutorModel.findByIdAndDelete(id).lean<TutorDoc | null>();
  },
};
