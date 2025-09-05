import { Schema, model, type InferSchemaType } from "mongoose";

// BASIC USER SCHEMA JUST TO GET FORMATTING IN SO THAT IT CAN BE ADJUSTED

const ChatSchema = new Schema(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ], // 1-on-1 or group chat
    messages: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        attachments: [{ type: String }], // could be file URLs
        sentAt: { type: Date, default: Date.now },
      },
    ],
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", index: true }, // optional link for context
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type ChatDoc = InferSchemaType<typeof ChatSchema>;
export const ChatModel = model<ChatDoc>("Chat", ChatSchema);
