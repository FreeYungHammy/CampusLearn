import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export const useForumSocket = (threadId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/forum`, {
      transports: ["websocket"],
    });

    console.log(`Attempting to connect to Socket.IO at ${SOCKET_URL}/forum`);

    newSocket.on("connect", () => {
      console.log("Socket.IO connected!");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error.message);
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
