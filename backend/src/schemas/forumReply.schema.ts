import { Schema, model, type InferSchemaType } from "mongoose";

const ForumReplySchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "ForumPost",
      required: true,
      indexed: true,
    },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    authorRole: {
      type: String,
      required: true,
      enum: ["student", "tutor", "admin"],
    },
    isAnonymous: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0, indexed: true },
  },
  { timestamps: true },
);

export type ForumReplyDoc = InferSchemaType<typeof ForumReplySchema>;
export const ForumReplyModel = model<ForumReplyDoc>(
  "ForumReply",
  ForumReplySchema,
);
