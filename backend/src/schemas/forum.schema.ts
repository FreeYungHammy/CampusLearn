import { Schema, model, type InferSchemaType } from "mongoose";

// BASIC USER SCHEMA JUST TO GET FORMATTING IN SO THAT IT CAN BE ADJUSTED

const ForumSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", index: true }, // optional link to topic
    isAnonymous: { type: Boolean, default: false },
    upvotes: { type: Number, default: 0 },
    replies: [{ type: Schema.Types.ObjectId, ref: "Forum" }], // self-referential for threaded posts
  },
  { timestamps: true },
);

export type ForumDoc = InferSchemaType<typeof ForumSchema>;
export const ForumModel = model<ForumDoc>("Forum", ForumSchema);
