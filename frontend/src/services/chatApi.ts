import http from './http';
import api from "@/lib/api";
import type { ChatMessage } from "@/types/ChatMessage";
import type { Conversation } from "./authApi";

export interface Conversation {
  _id: string;
  otherUser: {
    _id: string;
    email: string;
    role: 'student' | 'tutor';
    profile: {
      _id: string;
      name: string;
      surname: string;
      subjects?: string[];
      pfp?: {
        data: string;
        contentType: string;
      };
    };
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export const chatApi = {
  async getConversations(userId: string, token: string): Promise<Conversation[]> {
    const response = await http.get(`/chat/conversations/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getConversationThread(chatId: string, token: string): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/conversation/thread?chatId=${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async markThreadSeen(chatId: string, userId: string, token: string): Promise<void> {
    await http.post(
      `/chat/thread/seen`,
      { chatId, userId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};
