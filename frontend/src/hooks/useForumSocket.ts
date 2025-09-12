import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const useForumSocket = (threadId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/forum`, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    if (threadId) {
      newSocket.emit("join_thread", threadId);
    }

    return () => {
      newSocket.close();
    };
  }, [threadId]);

  return socket;
};
