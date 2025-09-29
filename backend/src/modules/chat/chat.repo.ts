import { type FilterQuery, type UpdateQuery } from "mongoose";
import { ChatModel, type ChatDoc } from "../../schemas/chat.schema";

export const ChatRepo = {
  // CREATE
  create(data: Partial<ChatDoc>) {
    return ChatModel.create(data);
  },

  // READ
  find(filter: FilterQuery<ChatDoc> = {}, limit = 20, skip = 0) {
    return ChatModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<ChatDoc[]>();
  },

  findById(id: string) {
    return ChatModel.findById(id).lean<ChatDoc | null>();
  },

  // conversation in both directions
  findConversation(aUserId: string, bUserId: string, limit = 50, skip = 0) {
    return ChatModel.find({
      $or: [
        { senderId: aUserId, receiverId: bUserId },
        { senderId: bUserId, receiverId: aUserId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<ChatDoc[]>();
  },

  // unread for a given receiver
  listUnreadFor(receiverId: string, limit = 50, skip = 0) {
    return ChatModel.find({ receiverId, seen: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean<ChatDoc[]>();
  },

  // UPDATE
  updateById(id: string, update: UpdateQuery<ChatDoc>) {
    return ChatModel.findByIdAndUpdate(id, update, {
      new: true,
    }).lean<ChatDoc | null>();
  },

  markSeen(id: string, seen = true) {
    return ChatModel.findByIdAndUpdate(
      id,
      { $set: { seen } },
      { new: true },
    ).lean<ChatDoc | null>({ virtuals: true });
  },

  markConversationSeen(fromUserId: string, toUserId: string) {
    // mark all messages sent from fromUserId to toUserId as seen
    return ChatModel.updateMany(
      { senderId: fromUserId, receiverId: toUserId, seen: false },
      { $set: { seen: true } },
    );
  },

  // DELETE
  deleteById(id: string) {
    return ChatModel.findByIdAndDelete(id).lean<ChatDoc | null>({
      virtuals: true,
    });
  },

  deleteConversation(aUserId: string, bUserId: string) {
    return ChatModel.deleteMany({
      $or: [
        { senderId: aUserId, receiverId: bUserId },
        { senderId: bUserId, receiverId: aUserId },
      ],
    });
  },

  deleteAllMessagesForUser(userId: string) {
    return ChatModel.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });
  },
};
