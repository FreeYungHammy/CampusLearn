import { create } from "zustand";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatState {
  isOpen: boolean;
  messages: Message[];
  toggleChat: () => void;
  closeChat: () => void;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  clearMessages: () => void;
  resetChat: () => void;
}

const getInitialMessages = (): Message[] => [
  {
    id: "1",
    text: "Hi! I'm the CampusLearn Assistant. How can I help you today?",
    isUser: false,
    timestamp: new Date(),
  },
];

export const useChatStore = create<ChatState>()((set, get) => ({
  isOpen: false,
  messages: getInitialMessages(),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  closeChat: () => set({ isOpen: false }),
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },
  clearMessages: () => set({ messages: [] }),
  resetChat: () => set({ 
    messages: getInitialMessages(), 
    isOpen: false 
  }),
}));
