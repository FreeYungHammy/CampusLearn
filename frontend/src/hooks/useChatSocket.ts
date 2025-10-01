import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { type ChatMessage, type SendMessagePayload } from "@/types/ChatMessage";
import { useAuthStore } from "@/store/authStore";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

/* -----------------------------------------------------------
   Module-level SINGLETON + listener registry
   ----------------------------------------------------------- */
let socketSingleton: Socket | null = null;
let listenersAttached = false;
let consumerCount = 0;

// Global “current room” so we can auto-rejoin after reconnects
let currentRoomGlobal: string | null = null;

// Fan-out registries so multiple hook instances can subscribe without
// re-attaching network listeners.
const onNewMessageSubs = new Set<(m: ChatMessage) => void>();
const onUserStatusSubs = new Set<(userId: string, status: "online" | "offline", lastSeen: Date) => void>();
const onChatClearedSubs = new Set<(payload: { chatId: string }) => void>();
const onConnectionChangeSubs = new Set<(connected: boolean) => void>();

// Safeguard: minimal throttle for typing emits (per room)
let lastTypingEmitAt = 0;

/* -----------------------------------------------------------
   (Re)create the singleton socket when needed
   ----------------------------------------------------------- */
function ensureSocket(token: string): Socket {
  if (socketSingleton && socketSingleton.connected) return socketSingleton;

  // If a socket exists but auth changed, disconnect it so we can reconnect with new auth
  if (socketSingleton) {
    try { socketSingleton.disconnect(); } catch {}
    socketSingleton = null;
    listenersAttached = false;
  }

  socketSingleton = io(`${SOCKET_URL}/chat`, {
    withCredentials: true,
    transports: ["websocket"],
    auth: { token },
    extraHeaders: { Authorization: `Bearer ${token}` },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });

  if (!listenersAttached) {
    attachCoreListeners(socketSingleton);
    listenersAttached = true;
  }

  return socketSingleton!;
}

/* -----------------------------------------------------------
   Attach network listeners ONCE per singleton
   ----------------------------------------------------------- */
function attachCoreListeners(s: Socket) {
  s.on("connect", () => {
    onConnectionChangeSubs.forEach((cb) => cb(true));
    // Re-join the last active room on reconnect
    if (currentRoomGlobal) {
      s.emit("join_room", currentRoomGlobal);
    }
  });

  s.on("connect_error", (err) => {
    // Still considered disconnected until 'connect'
    onConnectionChangeSubs.forEach((cb) => cb(false));
    console.error("Chat socket connection error:", err?.message || err);
  });

  s.on("disconnect", (reason) => {
    onConnectionChangeSubs.forEach((cb) => cb(false));
    // Do not clear currentRoomGlobal so we can re-join on next connect
    console.log("Chat socket disconnected:", reason);
  });

  s.on("new_message", (message: ChatMessage) => {
    onNewMessageSubs.forEach((cb) => cb(message));
  });

  s.on("user_status_change", (data: { userId: string; status: "online" | "offline"; lastSeen: string | Date }) => {
    const lastSeenDate = new Date(data.lastSeen);
    onUserStatusSubs.forEach((cb) => cb(data.userId, data.status, lastSeenDate));
  });

  s.on("chat_cleared", (payload: { chatId: string }) => {
    onChatClearedSubs.forEach((cb) => cb(payload));
  });

  // Optional: if your backend supports typing updates, keep these.
  s.on("typing_update", (data: { roomId: string; users: string[] }) => {
    // Exposed via room UI typically—hook consumer can add a handler if needed.
    // We keep this listener harmlessly to avoid errors if server emits it.
    // (Intentionally no-op here; add a shared registry if you later need it.)
  });
}

/* -----------------------------------------------------------
   Public hook
   ----------------------------------------------------------- */
export const useChatSocket = (
  onNewMessage: (message: ChatMessage) => void,
  onUserStatusChange?: (userId: string, status: "online" | "offline", lastSeen: Date) => void,
  onChatCleared?: (payload: { chatId: string }) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const currentRoomRef = useRef<string | null>(null);
  const { token } = useAuthStore();
  
  // Add a small delay to allow Zustand hydration to complete
  const [isTokenReady, setIsTokenReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTokenReady(true);
    }, 100); // Small delay to allow auth store to hydrate
    
    return () => clearTimeout(timer);
  }, []);

  // Register local subs on mount; unregister on unmount
  useEffect(() => {
    if (!isTokenReady || !token) {
      if (!isTokenReady) {
        console.log("Waiting for token to be ready...");
      } else {
        console.warn("No authentication token available for socket connection - skipping connection");
      }
      setIsConnected(false);
      // Don't aggressively cleanup - other components might still need the socket
      return;
    }

    consumerCount += 1;
    console.log(`Chat socket consumer added. Total consumers: ${consumerCount}`);

    // Create or reuse singleton socket
    const s = ensureSocket(token);

    // Subscribe this hook’s handlers to the shared registries
    onNewMessageSubs.add(onNewMessage);
    const statusCb =
      onUserStatusChange ||
      ((/* userId, status, lastSeen */) => {
        /* optional */
      });
    onUserStatusSubs.add(statusCb);

    const chatClearedCb = onChatCleared || (() => {});
    onChatClearedSubs.add(chatClearedCb);

    const connectionCb = (connected: boolean) => setIsConnected(connected);
    onConnectionChangeSubs.add(connectionCb);

    // Reflect current socket state
    setIsConnected(s.connected);

    return () => {
      // Unsubscribe this consumer
      onNewMessageSubs.delete(onNewMessage);
      onUserStatusSubs.delete(statusCb);
      onChatClearedSubs.delete(chatClearedCb);
      onConnectionChangeSubs.delete(connectionCb);

      consumerCount -= 1;
      console.log(`Chat socket consumer removed. Total consumers: ${consumerCount}`);

      // If no more consumers, tear down the socket with a small delay
      if (consumerCount <= 0 && socketSingleton) {
        console.log("No more consumers, scheduling socket cleanup...");
        setTimeout(() => {
          // Double-check that we still have no consumers (prevent race conditions)
          if (consumerCount <= 0 && socketSingleton) {
            try {
              // Leave any active room before disconnecting
              if (currentRoomGlobal) {
                socketSingleton.emit("leave_room", currentRoomGlobal);
              }
              socketSingleton.disconnect();
            } catch {}
            socketSingleton = null;
            listenersAttached = false;
            currentRoomGlobal = null;
            // Clear all subscription registries to prevent stale references
            onNewMessageSubs.clear();
            onUserStatusSubs.clear();
            onChatClearedSubs.clear();
            onConnectionChangeSubs.clear();
            console.log("Chat socket completely torn down - all registries cleared");
          }
        }, 1000); // 1 second delay to prevent rapid connect/disconnect cycles
      }
    };
  }, [isTokenReady, token, onNewMessage, onUserStatusChange, onChatCleared]);

  /* ---------------------------
     Rooms
     --------------------------- */
  const joinRoom = useCallback((chatId: string) => {
    if (!token) return console.error("No token; cannot join room.");
    const s = ensureSocket(token);

    // Leave the previously joined room (for this hook instance)
    if (currentRoomRef.current) {
      s.emit("leave_room", currentRoomRef.current);
    }

    s.emit("join_room", chatId);
    currentRoomRef.current = chatId;
    currentRoomGlobal = chatId; // So reconnects can auto-rejoin
    console.log("Joined room:", chatId);
  }, [token]);

  const leaveRoom = useCallback((chatId: string) => {
    if (!token) return;
    const s = ensureSocket(token);
    s.emit("leave_room", chatId);
    if (currentRoomRef.current === chatId) {
      currentRoomRef.current = null;
    }
    if (currentRoomGlobal === chatId) {
      currentRoomGlobal = null;
    }
    console.log("Left room:", chatId);
  }, [token]);

  /* ---------------------------
     Send message (with ack)
     Returns a Promise that resolves when the server acks
     --------------------------- */
  const sendMessage = useCallback(
    (payload: SendMessagePayload): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!token) {
          console.error("No token; cannot send message.");
          return reject(new Error("Not authenticated"));
        }
        const s = ensureSocket(token);
        if (!s.connected) {
          console.error("Socket not connected. Cannot send message.");
          return reject(new Error("Socket not connected"));
        }
        // Socket.IO acks: server should call the ack with { ok: boolean, message?: ChatMessage, error?: string }
        s.emit("send_message", payload, (ack?: { ok: boolean; message?: ChatMessage; error?: string }) => {
          if (ack?.ok) {
            // If the server provides the final saved message, you could also call onNewMessage here.
            // We rely on the server broadcasting 'new_message' to all room members including the sender.
            return resolve();
          }
          const err = new Error(ack?.error || "Send message failed");
          console.error("send_message ack error:", err.message);
          reject(err);
        });
      });
    },
    [token]
  );

  /* ---------------------------
     Typing indicator (debounced)
     Emits at most once every 400ms to avoid spam
     --------------------------- */
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!token) return;
      const s = ensureSocket(token);
      if (!s.connected || !currentRoomRef.current) return;
      const now = Date.now();
      if (now - lastTypingEmitAt < 400 && isTyping) return; // debounce for 'typing: true'
      lastTypingEmitAt = now;
      s.emit("typing_set", { roomId: currentRoomRef.current, isTyping });
    },
    [token]
  );

  return { sendMessage, isConnected, joinRoom, leaveRoom, emitTyping };
};
