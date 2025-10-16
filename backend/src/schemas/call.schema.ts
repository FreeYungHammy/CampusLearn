import mongoose, { Schema, type Document, type Model } from "mongoose";

export type CallStatus = "started" | "ended";

export interface CallDoc extends Document {
  callId: string; // stable identifier from app domain
  roomCode?: string;
  createdByUserId: string;
  status: CallStatus;
  media?: {
    screenshare?: boolean;
  };
  icePolicy?: {
    turnRequired?: boolean;
  };
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<CallDoc>(
  {
    callId: { type: String, required: true, index: true, unique: true },
    roomCode: { type: String },
    createdByUserId: { type: String, required: true, index: true },
    status: { type: String, enum: ["started", "ended"], required: true },
    media: {
      screenshare: { type: Boolean, default: false },
    },
    icePolicy: {
      turnRequired: { type: Boolean, default: false },
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const CallModel: Model<CallDoc> =
  mongoose.models.Call || mongoose.model<CallDoc>("Call", CallSchema);






