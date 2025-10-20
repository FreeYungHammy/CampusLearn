export interface ChatMessage {
  _id?: string;
  chatId: string;
  content: string;
  sender: { _id: string; name: string };
  senderId?: string;
  receiverId?: string;
  createdAt: string; // server sends Date; we keep it as ISO string on client
  editedAt?: string; // when message was last edited, ISO string on client
  isEdited?: boolean; // flag indicating if message has been edited
  seen?: boolean;
  upload?: {
    data: string;
    contentType: string;
    filename?: string;
  };
  uploadFilename?: string;
  uploadContentType?: string;
  messageType?: "text" | "booking_created" | "booking_confirmed" | "booking_cancelled" | "booking_completed";
  bookingId?: string;
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
