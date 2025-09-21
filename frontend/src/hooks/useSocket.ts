// frontend/src/hooks/useSocket.ts
import * as React from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const EVENTS = {
  REGISTER: "register",
  PRIVATE_MESSAGE: "private_message",
  SEND_MESSAGE: "send_message",
  GET_MESSAGES: "get_messages",
  MESSAGES: "messages",
  ONLINE_USERS: "online_users",
  SERVER_SHUTDOWN: "server_shutdown",
} as const;

export type ChatMessage = {
  id?: string;
  conversationId?: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number | string;
};

type UseSocket = {
  isConnected: boolean;
  error: string | null;
  messages: ChatMessage[];
  onlineUsers: string[];
  sendMessage: (to: string, content: string) => void;
  getMessages: (withUserId: string) => void;
  clearMessages: () => void;
  socket: Socket | null;
};

const SOCKET_URL =
  (import.meta as any).env?.VITE_SOCKET_URL ?? "http://localhost:5001";
const FORCE_POLLING =
  (import.meta as any).env?.VITE_SOCKET_FORCE_POLLING === "1";

/** Health-check settings — tweak for dev vs prod */
const HEALTH_PATH = "/health";
const HEALTH_POLL_INTERVAL = 2000; // milliseconds between checks (2s -> near-instant)
const HEALTH_TIMEOUT = 1500; // abort fetch after 1.5s

export function useSocket(currentUserId: string): UseSocket {
  const socketRef = React.useRef<Socket | null>(null);
  const hasLoggedOutRef = React.useRef(false);

  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);

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
    // helper to convert SOCKET_URL to an HTTP health URL
    const makeHealthUrl = (socketUrl: string) => {
      try {
        const u = new URL(socketUrl);
        if (u.protocol === "ws:") u.protocol = "http:";
        if (u.protocol === "wss:") u.protocol = "https:";
        u.pathname = HEALTH_PATH;
        return u.toString().replace(/\/$/, "");
      } catch {
        // fallback
        return socketUrl.replace(/^ws/, "http").replace(/\/$/, "") + HEALTH_PATH;
      }
    };

    const healthUrl = makeHealthUrl(SOCKET_URL);

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      withCredentials: true,
      transports: FORCE_POLLING ? ["polling"] : ["websocket", "polling"],
      upgrade: !FORCE_POLLING,
      auth: { userId: currentUserId },
      reconnection: true,
      reconnectionAttempts: 2, // keep small — health-check will handle full logout
      reconnectionDelay: 500,
      reconnectionDelayMax: 1500,
      timeout: 4000,
      // NOTE: socket heartbeat still present; we add HTTP polling for faster reliability
    });

    socketRef.current = s;

    // Prevent double logout
    const forceLogout = async () => {
      if (hasLoggedOutRef.current) return;
      hasLoggedOutRef.current = true;
      setIsConnected(false);
      try {
        await useAuthStore.getState().logout();
      } catch {
        /* ignore logout errors */
      } finally {
        // hard redirect to ensure app state reflects logged out
        window.location.href = "/login";
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      setError(null);
      s.emit(EVENTS.REGISTER, { userId: currentUserId });
    };

    // If socket disconnects for any reason, force logout (we also have health-check)
    const onDisconnect = () => {
      forceLogout();
    };

    const onConnectError = (err: Error) => {
      setError(err?.message ?? "Connection error");
    };

    const onReconnectFailed = () => {
      // socket failed to reconnect — fallback to force logout
      forceLogout();
    };

    // engine.io lower-level error (optional)
    const onEioError = (err: unknown) => {
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? (err as any).message
          : "Network/engine error",
      );
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    s.io.on?.("reconnect_failed", onReconnectFailed);
    s.io.engine?.on?.("connection_error", onEioError);

    s.on(EVENTS.PRIVATE_MESSAGE, handleIncomingMessage);
    s.on(EVENTS.MESSAGES, handleIncomingMessages);
    s.on(EVENTS.ONLINE_USERS, handleOnlineUsers);

    // optional graceful shutdown broadcast from server
    s.on(EVENTS.SERVER_SHUTDOWN, forceLogout);

    /* ---------------- HTTP health-check poller ---------------- */
    let pollId: number | null = null;

    const checkServerAlive = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
      try {
        const res = await fetch(healthUrl, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res.ok;
      } catch (err) {
        clearTimeout(timeoutId);
        return false;
      }
    };

    // run an immediate check then start interval
    (async () => {
      const ok = await checkServerAlive();
      if (!ok) {
        forceLogout();
        return;
      }
      pollId = window.setInterval(async () => {
        const alive = await checkServerAlive();
        if (!alive) forceLogout();
      }, HEALTH_POLL_INTERVAL);
    })();

    // cleanup
    return () => {
      try {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        s.off("connect_error", onConnectError);
        s.io.off?.("reconnect_failed", onReconnectFailed);
        s.io.engine?.off?.("connection_error", onEioError);
        s.off(EVENTS.PRIVATE_MESSAGE, handleIncomingMessage);
        s.off(EVENTS.MESSAGES, handleIncomingMessages);
        s.off(EVENTS.ONLINE_USERS, handleOnlineUsers);
        s.off(EVENTS.SERVER_SHUTDOWN, forceLogout);
      } finally {
        if (pollId) window.clearInterval(pollId);
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

      setMessages((prev) => [...prev, msg]);
      socket.emit(EVENTS.SEND_MESSAGE, { to, content });
    },
    [currentUserId, isConnected],
  );

  const getMessages = React.useCallback(
    (withUserId: string) => {
      const socket = socketRef.current;
      if (!socket || !isConnected) return;
      setMessages([]);
      socket.emit(EVENTS.GET_MESSAGES, { withUserId });
    },
    [isConnected],
  );

  const clearMessages = React.useCallback(() => setMessages([]), []);

  return {
    isConnected,
    error,
    messages,
    onlineUsers,
    sendMessage,
    getMessages,
    clearMessages,
    socket: socketRef.current,
  };
}
