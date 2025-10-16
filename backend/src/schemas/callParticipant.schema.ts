import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface CallParticipantDoc extends Document {
  callId: string; // references Call.callId (not ObjectId to simplify lookups by domain ID)
  userId: string;
  role: "tutor" | "student" | "guest";
  joinedAt: Date;
  leftAt?: Date | null;
  stats?: {
    avgRttMs?: number;
    avgBitrateKbps?: number;
    lossPct?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CallParticipantSchema = new Schema<CallParticipantDoc>(
  {
    callId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["tutor", "student", "guest"], required: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
    stats: {
      avgRttMs: { type: Number },
      avgBitrateKbps: { type: Number },
      lossPct: { type: Number },
    },
  },
  { timestamps: true },
);

CallParticipantSchema.index({ callId: 1, userId: 1 });

export const CallParticipantModel: Model<CallParticipantDoc> =
  mongoose.models.CallParticipant ||
  mongoose.model<CallParticipantDoc>("CallParticipant", CallParticipantSchema);






