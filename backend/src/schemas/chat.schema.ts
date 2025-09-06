import { Schema, model, type InferSchemaType } from "mongoose";

const ChatSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    upload: { type: Buffer },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ChatDoc = InferSchemaType<typeof ChatSchema>;
export const ChatModel = model<ChatDoc>("Message", ChatSchema);
