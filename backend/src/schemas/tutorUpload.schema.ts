import { Schema, model, type InferSchemaType } from "mongoose";

const FileSchema = new Schema(
  {
    tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
    subject: { type: String, required: true },
    subtopic: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: Buffer, required: true, select: false }, // The binary file data
    contentType: { type: String, required: true }, // The MIME type of the file
  },
  { timestamps: true },
);

FileSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});

FileSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, content, ...rest } = ret;
    return rest;
  },
});

FileSchema.set("toObject", { virtuals: true });

export type FileDoc = InferSchemaType<typeof FileSchema>;
export const FileModel = model<FileDoc>("File", FileSchema);
