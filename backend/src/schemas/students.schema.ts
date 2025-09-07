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

StudentSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});
StudentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    return rest;
  },
});
StudentSchema.set("toObject", { virtuals: true });

export type StudentDoc = InferSchemaType<typeof StudentSchema>;
export const StudentModel = model<StudentDoc>("Student", StudentSchema);
