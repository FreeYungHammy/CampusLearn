import mongoose, { Schema, Model } from "mongoose";
import { BroadcastRepo } from "./broadcast.repo";

interface IBotpressSession {
  conversationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}
const BotpressSessionSchema = new Schema<IBotpressSession>(
  {
    conversationId: { type: String, index: true, unique: true, required: true },
    userId: { type: String, index: true, required: true },
    role: { type: String, index: true, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "botpress_sessions" },
);

const BotpressSession: Model<IBotpressSession> =
  (mongoose.models.BotpressSession as Model<IBotpressSession>) ||
  mongoose.model<IBotpressSession>("BotpressSession", BotpressSessionSchema);

const User = mongoose.model("User");
function deriveRole(u: any): string {
  if (!u) return "unknown";
  return (
    u.role ??
    u.userType ??
    u.accountType ??
    (u.isTutor ? "tutor" : u.isAdmin ? "admin" : "student")
  );
}

export const BroadcastService = {
  async resolveTutor(
    conversationId: string,
  ): Promise<{ tutorId: string | null; isTutor: boolean }> {
    const sess = await BotpressSession.findOne({ conversationId })
      .lean<IBotpressSession>()
      .exec();
    const tutorId = sess?.userId ?? null;
    if (!tutorId) return { tutorId: null, isTutor: false };
    const user = await User.findById(tutorId).lean();
    const role = deriveRole(user);
    return { tutorId, isTutor: role === "tutor" || sess?.role === "tutor" };
  },

  async broadcast(conversationId: string, message: string) {
    if (!message?.trim())
      return { ok: false as const, sent: 0, error: "Empty message" };
    const { tutorId, isTutor } = await this.resolveTutor(conversationId);
    if (!tutorId) return { ok: false as const, sent: 0, error: "Unknown user" };
    if (!isTutor)
      return {
        ok: false as const,
        sent: 0,
        error: "Only tutors can broadcast",
      };
    const recipients = await BroadcastRepo.findRecipientIdsForTutor(tutorId);
    if (!recipients.length)
      return { ok: true as const, sent: 0, note: "No existing chats" };
    const sent = await BroadcastRepo.insertBroadcast(
      tutorId,
      recipients,
      message.trim(),
    );
    return { ok: true as const, sent };
  },

  async checkRole(conversationId: string) {
    const { isTutor } = await this.resolveTutor(conversationId);
    return { allowed: isTutor };
  },
};
