
import { Schema, model, type InferSchemaType } from "mongoose";

const VideoSchema = new Schema(
  {
    filename: { type: String, required: true },
    bucketPath: { type: String, required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    description: { type: String },
    duration: { type: Number }, // in seconds
    compressionStatus: { 
      type: String, 
      enum: ["pending", "compressing", "completed", "failed"], 
      default: "pending" 
    },
    compressedQualities: [{ type: String }], // Array of available qualities (e.g., ["360p", "480p", "720p"])
  },
  { timestamps: true },
);

export type VideoDoc = InferSchemaType<typeof VideoSchema> & { _id: Schema.Types.ObjectId };
export const VideoModel = model<VideoDoc>("Video", VideoSchema);
