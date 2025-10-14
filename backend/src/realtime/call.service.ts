import { CallModel } from "../schemas/call.schema";
import { CallParticipantModel } from "../schemas/callParticipant.schema";

export const CallService = {
  async startCall(callId: string, createdByUserId: string, roomCode?: string) {
    const existing = await CallModel.findOne({ callId }).lean();
    if (existing) return existing;
    const doc = await CallModel.create({
      callId,
      roomCode,
      createdByUserId,
      status: "started",
      startedAt: new Date(),
    });
    return doc.toObject();
  },

  async joinCall(callId: string, userId: string, role: "tutor" | "student" | "guest") {
    const existing = await CallParticipantModel.findOne({ callId, userId }).lean();
    if (existing && !existing.leftAt) return existing;
    const doc = await CallParticipantModel.findOneAndUpdate(
      { callId, userId },
      { $set: { role, joinedAt: new Date(), leftAt: null } },
      { upsert: true, new: true },
    );
    return doc.toObject();
  },

  async leaveCall(callId: string, userId: string) {
    await CallParticipantModel.updateOne(
      { callId, userId, leftAt: null },
      { $set: { leftAt: new Date() } },
    );
  },

  async endCall(callId: string) {
    await CallModel.updateOne(
      { callId, status: "started" },
      { $set: { status: "ended", endedAt: new Date() } },
    );
  },
};


