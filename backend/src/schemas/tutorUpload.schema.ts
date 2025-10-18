import { Schema, model, type InferSchemaType } from "mongoose";

const FileSchema = new Schema(
  {
    tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
    subject: { type: String, required: true },
    subtopic: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    contentType: { type: String, required: true },
    content: {
      type: Buffer,
      select: false, // Exclude by default
    },
    size: {
      type: Number,
    },
    externalUri: {
      type: String,
      required: false,
    },
    compressionStatus: { 
      type: String, 
      enum: ["pending", "compressing", "completed", "failed"], 
      default: "pending" 
    },
    compressedQualities: [{ type: String }], // Array of available qualities (e.g., ["360p", "480p", "720p"])
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
