
import { Schema, model, type InferSchemaType } from "mongoose";

const CourseSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export type CourseDoc = InferSchemaType<typeof CourseSchema>;
export const CourseModel = model<CourseDoc>("Course", CourseSchema);
