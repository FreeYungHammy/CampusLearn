import { Schema, model, type InferSchemaType } from "mongoose";

const ChatSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chatId: { type: String, required: true },
    content: { type: String, required: true },
    upload: { type: Buffer },
    uploadFilename: { type: String },
    uploadContentType: { type: String },
    seen: { type: Boolean, default: false },
    // Edit-related fields
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    // Booking-related fields
    messageType: { 
      type: String, 
      enum: ["text", "booking_created", "booking_confirmed", "booking_cancelled", "booking_completed"],
      default: "text"
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true },
);

ChatSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});
ChatSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    return rest;
  },
});
ChatSchema.set("toObject", { virtuals: true });

export type ChatDoc = InferSchemaType<typeof ChatSchema>;
export const ChatModel = model<ChatDoc>("Message", ChatSchema);
