import mongoose from "mongoose";

const Message = mongoose.model("Message"); // already registered in your app

function buildChatId(a: string, b: string) {
  return [a, b].sort().join("-");
}

export const BroadcastRepo = {
  /** Find all distinct userIds that have an existing chat with this tutor */
  async findRecipientIdsForTutor(tutorId: string): Promise<string[]> {
    const rows = await (Message as any).aggregate([
      { $match: { $or: [{ senderId: tutorId }, { receiverId: tutorId }] } },
      {
        $project: {
          other: {
            $cond: [
              { $eq: ["$senderId", tutorId] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      { $group: { _id: "$other" } },
    ]);
    return rows.map((r: any) => String(r._id)).filter(Boolean);
  },

  /** Insert one outbound message per recipient */
  async insertBroadcast(
    tutorId: string,
    recipients: string[],
    content: string,
  ) {
    const now = new Date();
    const docs = recipients.map((rid) => ({
      senderId: tutorId,
      receiverId: rid,
      chatId: buildChatId(tutorId, rid),
      content,
      seen: false,
      messageType: "text",
      createdAt: now,
      updatedAt: now,
    }));
    if (!docs.length) return 0;
    await (Message as any).insertMany(docs, { ordered: false });
    return docs.length;
  },
};
