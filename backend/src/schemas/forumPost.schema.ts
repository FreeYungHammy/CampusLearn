import { Schema, model, type InferSchemaType } from "mongoose";

const ForumPostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    topic: { type: String, required: true, indexed: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorRole: {
      type: String,
      required: true,
      enum: ["student", "tutor"],
    },
    isAnonymous: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    replies: [{ type: Schema.Types.ObjectId, ref: "ForumReply" }],
  },
  { timestamps: true },
);

export type ForumPostDoc = InferSchemaType<typeof ForumPostSchema>;
export const ForumPostModel = model<ForumPostDoc>("ForumPost", ForumPostSchema);
