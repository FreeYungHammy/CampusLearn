import { Schema, model, type InferSchemaType } from "mongoose";

const StudentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true }, // (typo fix)
    surname: { type: String, required: true },
    enrolledCourses: [{ type: String }],
  },
  { timestamps: true },
);

export type StudentDoc = InferSchemaType<typeof StudentSchema>;
export const StudentModel = model<StudentDoc>("Student", StudentSchema);
