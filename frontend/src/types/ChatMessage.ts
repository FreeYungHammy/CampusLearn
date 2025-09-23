export interface ChatMessage {
  _id?: string;
  chatId: string;
  content: string;
  sender: { _id: string; name: string };
  senderId?: string;
  receiverId?: string;
  createdAt: string; // server sends Date; we keep it as ISO string on client
  seen?: boolean;
  upload?: {
    data: string;
    contentType: string;
    filename?: string;
  };
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  senderId: string;
  receiverId?: string;
  upload?: {
    data: string;
    contentType: string;
    filename?: string;
  };
}
