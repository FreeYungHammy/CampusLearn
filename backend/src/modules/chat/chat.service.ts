import { ChatRepo } from "../chat/chat.repo";
import type { ChatDoc } from "../../schemas/chat.schema";

export const ChatService = {
  send(input: Partial<ChatDoc>) {
    if (!input.senderId) throw new Error("senderId is required");
    if (!input.receiverId) throw new Error("receiverId is required");
    // allow either text or upload, but not empty
    if (!input.content && !input.upload)
      throw new Error("content or upload is required");
    return ChatRepo.create(input);
  },

  list(filter: Partial<ChatDoc> = {}, limit = 20, skip = 0) {
    return ChatRepo.find(filter as any, limit, skip);
  },

  get(id: string) {
    return ChatRepo.findById(id);
  },

  conversation(aUserId: string, bUserId: string, limit = 50, skip = 0) {
    return ChatRepo.findConversation(aUserId, bUserId, limit, skip);
  },

  markSeen(id: string) {
    return ChatRepo.markSeen(id, true);
  },

  markThreadSeen(fromUserId: string, toUserId: string) {
    return ChatRepo.markConversationSeen(fromUserId, toUserId);
  },

  remove(id: string) {
    return ChatRepo.deleteById(id);
  },
};
