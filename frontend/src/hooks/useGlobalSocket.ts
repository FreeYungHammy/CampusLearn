import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001";

let socket: Socket | null = null;

export const useGlobalSocket = () => {
  const { token, refreshPfpForUser } = useAuthStore((s) => ({
    token: s.token,
    refreshPfpForUser: s.refreshPfpForUser,
  }));

  useEffect(() => {
    if (!token) {
      if (socket) {
        console.log("Disconnecting global socket");
        socket.disconnect();
        socket = null;
      }
      return;
    }

    if (!socket) {
      console.log("Connecting global socket...");
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        console.log("Global socket connected:", socket?.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("Global socket disconnected:", reason);
      });

      socket.on("connect_error", (err) => {
        console.error("Global socket connection error:", err.message);
      });

      // --- Global Event Listeners ---
      socket.on(
        "pfp_updated",
        (data: { userId: string; timestamp: number }) => {
          console.log(
            `pfp_updated event received for user: ${data.userId} at ${data.timestamp}`,
          );
          refreshPfpForUser(data.userId, data.timestamp);
        },
      );
    }

    // Return cleanup function
    return () => {
      // Disconnection is handled when token is cleared
    };
  }, [token, refreshPfpForUser]);

  return socket;
};
