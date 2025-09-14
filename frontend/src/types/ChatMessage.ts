export interface ChatMessage {
  chatId: string;
  content: string;
  sender: { _id: string; name: string };
  createdAt: string; // server sends Date; we keep it as ISO string on client
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  senderId: string;
}
