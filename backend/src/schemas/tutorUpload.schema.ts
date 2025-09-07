import { Schema, model, type InferSchemaType } from "mongoose";

const tutorUpload = new Schema(
  {
    tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
    subject: { type: String, required: true },
    subtopic: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    content: { type: Buffer, required: true, select: false }, // actual binary data
  },
  { timestamps: true },
);

tutorUpload.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});
tutorUpload.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, content, ...rest } = ret;
    return rest;
  },
});
tutorUpload.set("toObject", { virtuals: true });

export type FileDoc = InferSchemaType<typeof tutorUpload>;
export const FileModel = model<FileDoc>("File", tutorUpload);
