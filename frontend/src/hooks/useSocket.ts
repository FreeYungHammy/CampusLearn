// frontend/src/hooks/useSocket.ts
import * as React from "react";
import { io, Socket } from "socket.io-client";

/** ──────────────────────────────────────────────────────────────────────────
 *  Adjust these if your server uses different event names
 *  ────────────────────────────────────────────────────────────────────────── */
const EVENTS = {
  REGISTER: "register", // -> payload: { userId }
  PRIVATE_MESSAGE: "private_message", // <- incoming single message
  SEND_MESSAGE: "send_message", // -> payload: { to, content }
  GET_MESSAGES: "get_messages", // -> payload: { withUserId }
  MESSAGES: "messages", // <- incoming array of messages
  ONLINE_USERS: "online_users", // <- optional presence updates
} as const;

/** Message model used by the UI */
export type ChatMessage = {
  id?: string;
  conversationId?: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number | string; // epoch ms or ISO; rendered with Date()
};

/** Hook return type */
type UseSocket = {
  isConnected: boolean;
  error: string | null;
  messages: ChatMessage[];
  onlineUsers: string[];
  sendMessage: (to: string, content: string) => void;
  getMessages: (withUserId: string) => void;
  clearMessages: () => void;
  socket: Socket | null; // Add the raw socket instance
};

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ?? "http://localhost:5001";

/**
 * Set VITE_SOCKET_FORCE_POLLING=1 in .env to avoid WS upgrade issues on Windows/Corp networks.
 * Otherwise we attempt websocket first with polling fallback.
 */
const FORCE_POLLING =
  (import.meta as any).env?.VITE_SOCKET_FORCE_POLLING === "1";

/**
 * A robust Socket.IO hook with polling fallback and tidy listener cleanup.
 *
 * @param currentUserId - the authenticated/app user id (e.g., "User_A")
 */
export function useSocket(currentUserId: string): UseSocket {
  const socketRef = React.useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);

  // Stable handlers (so we can add/remove as listeners safely)
  const handleIncomingMessage = React.useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleIncomingMessages = React.useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs ?? []);
  }, []);

  const handleOnlineUsers = React.useCallback((users: string[]) => {
    setOnlineUsers(Array.isArray(users) ? users : []);
  }, []);

  React.useEffect(() => {
    // Build connection options
    const s = io(SOCKET_URL, {
      path: "/socket.io",
      withCredentials: true,
      transports: FORCE_POLLING ? ["polling"] : ["websocket", "polling"],
      upgrade: !FORCE_POLLING,
      // Helpful for auth/identification on the server:
      auth: { userId: currentUserId },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    });

    socketRef.current = s;

    // Core lifecycle
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
      // Some servers expect an explicit register event
      s.emit(EVENTS.REGISTER, { userId: currentUserId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err: Error) => {
      setError(err.message || "Connection error");
    };

    // engine.io lower-level errors (useful on Windows when upgrade is blocked)
    const onEioError = (err: unknown) => {
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? (err as any).message
          : "Network/engine error",
      );
    };

    // Attach listeners
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    // @ts-expect-error engine property exists at runtime
    s.io.engine?.on?.("connection_error", onEioError);

    s.on(EVENTS.PRIVATE_MESSAGE, handleIncomingMessage);
    s.on(EVENTS.MESSAGES, handleIncomingMessages);
    s.on(EVENTS.ONLINE_USERS, handleOnlineUsers);

    // Cleanup on unmount
    return () => {
      try {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.off("connect_error", onConnectError);
        // @ts-expect-error engine property exists at runtime
        s.io.engine?.off?.("connection_error", onEioError);

        s.off(EVENTS.PRIVATE_MESSAGE, handleIncomingMessage);
        s.off(EVENTS.MESSAGES, handleIncomingMessages);
        s.off(EVENTS.ONLINE_USERS, handleOnlineUsers);
      } finally {
        s.close();
        socketRef.current = null;
      }
    };
  }, [
    currentUserId,
    handleIncomingMessage,
    handleIncomingMessages,
    handleOnlineUsers,
  ]);

  /** Send a private message to a recipient */
  const sendMessage = React.useCallback(
    (to: string, content: string) => {
      const socket = socketRef.current;
      if (!socket || !isConnected || !content.trim()) return;

      const msg: ChatMessage = {
        senderId: currentUserId,
        recipientId: to,
        content,
        timestamp: Date.now(),
      };

      // Optimistic append (comment out if you prefer server-echo only)
      setMessages((prev) => [...prev, msg]);

      socket.emit(EVENTS.SEND_MESSAGE, { to, content });
    },
    [currentUserId, isConnected],
  );

  /** Ask the server for the conversation history with a peer */
  const getMessages = React.useCallback(
    (withUserId: string) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) return;

      // You can clear first to avoid showing stale list while loading
      setMessages([]);

      socket.emit(EVENTS.GET_MESSAGES, { withUserId });
      // The server should answer with EVENTS.MESSAGES (array)
    },
    [isConnected],
  );

  /** Clear current in-memory list */
  const clearMessages = React.useCallback(() => setMessages([]), []);

  return {
    isConnected,
    error,
    messages,
    onlineUsers,
    sendMessage,
    getMessages,
    clearMessages,
    socket: socketRef.current, // Expose the raw socket instance
  };
}
