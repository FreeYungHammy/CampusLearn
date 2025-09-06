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

export type FileDoc = InferSchemaType<typeof tutorUpload>;
export const FileModel = model<FileDoc>("File", tutorUpload);
