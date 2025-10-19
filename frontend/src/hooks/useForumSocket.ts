import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { SocketManager } from "../services/socketManager";
import { useAuthStore } from "../store/authStore";

export const useForumSocket = (threadId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      console.warn("[useForumSocket] No token available for forum socket");
      setSocket(null);
      return;
    }

    const SOCKET_URL = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
    console.log("[useForumSocket] Initializing forum socket with centralized manager");

    // Initialize socket manager if not already done
    if (!SocketManager.isSocketConnected()) {
      SocketManager.initialize({
        url: SOCKET_URL,
        token: token,
      });
    }

    // Get main socket (forum uses main namespace)
    const mainSocket = SocketManager.getSocket();
    if (!mainSocket) {
      console.error("[useForumSocket] Failed to get main socket from manager");
      setSocket(null);
      return;
    }

    setSocket(mainSocket);

    // Join thread if threadId is provided
    if (threadId && mainSocket.connected) {
      console.log("[useForumSocket] Joining thread:", threadId);
      mainSocket.emit("join_thread", threadId);
    }

    // Handle socket connection changes
    const handleConnect = () => {
      console.log("[useForumSocket] Socket connected");
      if (threadId) {
        mainSocket.emit("join_thread", threadId);
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log("[useForumSocket] Socket disconnected:", reason);
    };

    mainSocket.on("connect", handleConnect);
    mainSocket.on("disconnect", handleDisconnect);

    return () => {
      // Leave thread if we were in one
      if (threadId && mainSocket.connected) {
        console.log("[useForumSocket] Leaving thread:", threadId);
        mainSocket.emit("leave_thread", threadId);
      }
      
      // Remove event listeners
      mainSocket.off("connect", handleConnect);
      mainSocket.off("disconnect", handleDisconnect);
      
      // Don't disconnect the socket - let the manager handle it
    };
  }, [token, threadId]);

  return socket;
};
