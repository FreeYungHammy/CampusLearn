import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { SocketManager } from "../services/socketManager";

const SOCKET_URL = import.meta.env.VITE_WS_URL as string;

export const useGlobalSocket = () => {
  const { token, refreshPfpForUser } = useAuthStore((s) => ({
    token: s.token,
    refreshPfpForUser: s.refreshPfpForUser,
  }));

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      console.log("No token, disconnecting global socket");
      SocketManager.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    console.log("Initializing global socket with centralized manager");
    
    // Initialize socket manager
    SocketManager.initialize({
      url: SOCKET_URL,
      token: token,
    });

    // Register global event handlers
    SocketManager.registerHandlers({
      global: {
        onPfpUpdated: (data: { userId: string; timestamp: number }) => {
          console.log(
            `[useGlobalSocket] pfp_updated event received for user: ${data.userId} at ${data.timestamp}`,
          );
          refreshPfpForUser(data.userId, data.timestamp);
        },
        onConnectionChange: (connected: boolean) => {
          console.log(`[useGlobalSocket] Connection state changed: ${connected}`);
          setConnected(connected);
        },
      },
    });

    // Get socket instance
    const globalSocket = SocketManager.getGlobalSocket();
    setSocket(globalSocket);
    setConnected(SocketManager.isSocketConnected());

    // Add connection listener
    const connectionListener = (connected: boolean) => {
      setConnected(connected);
    };
    SocketManager.addConnectionListener(connectionListener);

    // Cleanup
    return () => {
      SocketManager.removeConnectionListener(connectionListener);
      // Don't disconnect here - let the manager handle it globally
    };
  }, [token, refreshPfpForUser]);

  return socket;
};
