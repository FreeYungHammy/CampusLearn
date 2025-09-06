import { type FilterQuery, type UpdateQuery } from "mongoose";
import { StudentModel, type StudentDoc } from "../../schemas/students.schema";

export const StudentRepo = {
  // CREATE
  create(data: Partial<StudentDoc>) {
    return StudentModel.create(data);
  },

  // READ
  find(filter: FilterQuery<StudentDoc> = {}, limit = 20, skip = 0) {
    return StudentModel.find(filter)
      .limit(limit)
      .skip(skip)
      .lean<StudentDoc[]>();
  },

  findById(id: string) {
    return StudentModel.findById(id).lean<StudentDoc | null>();
  },

  findByUserId(userId: string) {
    return StudentModel.findOne({ userId }).lean<StudentDoc | null>();
  },

  // convenience: enrolled course queries
  listByCourse(code: string, limit = 20, skip = 0) {
    return StudentModel.find({ enrolledCourses: code })
      .limit(limit)
      .skip(skip)
      .lean<StudentDoc[]>();
  },

  // UPDATE
  updateById(id: string, update: UpdateQuery<StudentDoc>) {
    return StudentModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean<StudentDoc | null>();
  },

  enroll(id: string, courseCode: string) {
    return StudentModel.findByIdAndUpdate(
      id,
      { $addToSet: { enrolledCourses: courseCode } },
      { new: true },
    ).lean<StudentDoc | null>({ virtuals: true });
  },

  unenroll(id: string, courseCode: string) {
    return StudentModel.findByIdAndUpdate(
      id,
      { $pull: { enrolledCourses: courseCode } },
      { new: true },
    ).lean<StudentDoc | null>();
  },

  // DELETE
  deleteById(id: string) {
    return StudentModel.findByIdAndDelete(id).lean<StudentDoc | null>({
      virtuals: true,
    });
  },
};
