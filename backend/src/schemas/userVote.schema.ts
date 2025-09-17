import { Schema, model, type InferSchemaType } from "mongoose";

const UserVoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, required: true }, // Refers to ForumPost or ForumReply
    targetType: {
      type: String,
      required: true,
      enum: ["ForumPost", "ForumReply"],
    },
    voteType: { type: Number, required: true, enum: [1, -1] }, // 1 for upvote, -1 for downvote
  },
  { timestamps: true },
);

// Ensure a user can only vote once per target item
UserVoteSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true },
);

export type UserVoteDoc = InferSchemaType<typeof UserVoteSchema>;
export const UserVoteModel = model<UserVoteDoc>("UserVote", UserVoteSchema);
