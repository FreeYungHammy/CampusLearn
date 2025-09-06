export type ChatMessage = {
  id: string;
  senderId: string; // User._id
  receiverId: string; // User._id
  content: string;
  // If backend returns a file, expose a URL here rather than raw Buffer
  uploadUrl?: string;
  seen: boolean;
  createdAt: string;
  updatedAt?: string;
};
