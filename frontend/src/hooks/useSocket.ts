import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:8080";

export const useSocket = (userId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(SOCKET_URL);

    socketRef.current.emit("newUser", userId);

    socketRef.current.on("getMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  const sendMessage = (recipientId: string, messageContent: any) => {
    const message = {
      senderId: userId,
      recipientId,
      content: messageContent,
      timestamp: new Date(),
    };
    socketRef.current?.emit("sendMessage", { recipientId, message });
    setMessages((prev) => [...prev, message]);
  };

  return { messages, sendMessage };
};
