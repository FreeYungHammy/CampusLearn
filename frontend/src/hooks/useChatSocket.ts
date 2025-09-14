import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage, SendMessagePayload } from "@/types/ChatMessage";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const useChatSocket = (chatId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    console.log("useChatSocket: useEffect triggered for chatId:", chatId);
    // Disconnect any existing socket before attempting to create a new one
    if (socketRef.current) {
      console.log("useChatSocket: Disconnecting existing socket.");
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log("useChatSocket: Initializing new socket connection.");
    const s = io(`${SOCKET_URL}`, {
      path: "/socket.io",
      transports: ["websocket"],
      nsp: "/chat",
    });
    socketRef.current = s;

    s.on("connect", () => console.log("useChatSocket: Socket connected."));
    s.on("disconnect", () =>
      console.log("useChatSocket: Socket disconnected."),
    );
    s.on("connect_error", (err) =>
      console.error("useChatSocket: Socket connection error:", err),
    );

    console.log("useChatSocket: Emitting 'join_room' for chatId:", chatId);
    s.emit("join_room", chatId);

    s.on("new_message", (msg: ChatMessage) => {
      console.log("useChatSocket: Received 'new_message':", msg);
      const normalized: ChatMessage = {
        ...msg,
        createdAt:
          typeof msg.createdAt === "string"
            ? msg.createdAt
            : new Date(msg.createdAt as unknown as string).toISOString(),
      };
      setMessages((prev) => [...prev, normalized]);
    });

    return () => {
      console.log("useChatSocket: Cleanup function. Disconnecting socket.");
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [chatId]);

  const sendMessage = (payload: SendMessagePayload) => {
    console.log("useChatSocket: sendMessage called with payload:", payload);
    if (socketRef.current) {
      socketRef.current.emit("send_message", payload);
      console.log("useChatSocket: Emitted 'send_message'.");
    } else {
      console.warn("useChatSocket: Socket not connected, cannot send message.");
    }
  };

  return { messages, sendMessage };
};
