import { useEffect, useRef } from "react";
import { SocketManager } from "../services/socketManager";
import { useAuthStore } from "../store/authStore";

/**
 * Global socket initialization hook
 * Ensures sockets are initialized once per tab and shared across components
 */
export function useGlobalSocket() {
  const { token, user } = useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!token || !user || initializedRef.current) {
      return;
    }

    const wsUrl = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");
    
    console.log("[useGlobalSocket] Initializing global socket for tab", { 
      wsUrl, 
      hasToken: !!token, 
      userId: user.id 
    });

    // Initialize socket manager once per tab
    if (!SocketManager.isInitialized()) {
      SocketManager.initialize({
        url: wsUrl,
        token: token,
      });
      initializedRef.current = true;
    }

    // Cleanup on unmount (when tab is closed)
    return () => {
      console.log("[useGlobalSocket] Tab closing, disconnecting sockets");
      SocketManager.disconnect();
      initializedRef.current = false;
    };
  }, [token, user]);

  return {
    isConnected: SocketManager.isSocketConnected(),
    isInitialized: SocketManager.isInitialized(),
    socket: SocketManager.getSocket(),
    chatSocket: SocketManager.getChatSocket(),
    videoSocket: SocketManager.getVideoSocket(),
    globalSocket: SocketManager.getGlobalSocket(),
  };
}