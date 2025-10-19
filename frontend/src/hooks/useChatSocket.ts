import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { type ChatMessage, type SendMessagePayload } from "@/types/ChatMessage";
import { useAuthStore } from "@/store/authStore";
import { SocketManager } from "../services/socketManager";

// Hardcode the URL to avoid any environment variable issues
const SOCKET_BASE_URL = (import.meta.env.VITE_WS_URL as string).replace(/\/$/, "");

/* -----------------------------------------------------------
   Module-level SINGLETON + listener registry
   ----------------------------------------------------------- */
let consumerCount = 0;
let handlersSetup = false; // Track if handlers have been set up

// Global "current room" so we can auto-rejoin after reconnects
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
   Ensure socket manager is initialized and return chat socket
   ----------------------------------------------------------- */
function ensureSocket(token: string): Socket | null {
  // Initialize socket manager if not already done
  if (!SocketManager.isSocketConnected()) {
    console.log("🔌 Initializing Socket Manager for chat");
    SocketManager.initialize({
      url: SOCKET_BASE_URL,
      token: token,
    });
  }

  return SocketManager.getChatSocket();
}

/* -----------------------------------------------------------
   Setup chat handlers for socket manager (only once)
   ----------------------------------------------------------- */
function setupChatHandlers() {
  if (handlersSetup) {
    console.log("🔌 [ChatManager] Handlers already setup, skipping");
    return;
  }

  console.log("🔌 [ChatManager] Setting up chat handlers");
  SocketManager.registerHandlers({
    chat: {
      onNewMessage: (message: ChatMessage) => {
        console.log("🔌 [ChatManager] Processing new message:", message._id);
        onNewMessageSubs.forEach((cb) => cb(message));
      },
      onUserStatusChange: (userId: string, status: "online" | "offline", lastSeen: Date) => {
        console.log("🔌 [ChatManager] Received user_status_change:", { userId, status, lastSeen });
        onUserStatusSubs.forEach((cb) => cb(userId, status, lastSeen));
      },
      onChatCleared: (payload: { chatId: string }) => {
        onChatClearedSubs.forEach((cb) => cb(payload));
      },
      onConnectionChange: (connected: boolean) => {
        console.log(`🔌 [ChatManager] Connection state changed: ${connected}`);
        onConnectionChangeSubs.forEach((cb) => cb(connected));
        // Re-join the last active room on reconnect
        if (connected && currentRoomGlobal) {
          const chatSocket = SocketManager.getChatSocket();
          if (chatSocket) {
            chatSocket.emit("join_room", currentRoomGlobal);
          }
        }
      },
    },
  });
  
  handlersSetup = true;
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
      return;
    }

    consumerCount += 1;
    console.log(`Chat socket consumer added. Total consumers: ${consumerCount}`);

    // Ensure socket manager is initialized
    const s = ensureSocket(token);
    if (!s) {
      console.error("Failed to get chat socket from manager");
      setIsConnected(false);
      return;
    }

    // Setup handlers once
    setupChatHandlers();

    // Subscribe this hook's handlers to the shared registries
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

      // If no more consumers, leave room and reset handlers
      if (consumerCount <= 0) {
        console.log("No more chat consumers, leaving current room and resetting handlers");
        if (currentRoomGlobal) {
          const chatSocket = SocketManager.getChatSocket();
          if (chatSocket) {
            chatSocket.emit("leave_room", currentRoomGlobal);
          }
          currentRoomGlobal = null;
        }
        // Reset handlers setup flag so they can be re-registered if needed
        handlersSetup = false;
      }
    };
  }, [isTokenReady, token, onNewMessage, onUserStatusChange, onChatCleared]);

  /* ---------------------------
     Rooms
     --------------------------- */
  const joinRoom = useCallback((chatId: string) => {
    if (!token) return console.error("No token; cannot join room.");
    const s = ensureSocket(token);
    if (!s) return console.error("No socket available; cannot join room.");

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
    if (!s) return;
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
        if (!s || !s.connected) {
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
      if (!s || !s.connected || !currentRoomRef.current) return;
      const now = Date.now();
      if (now - lastTypingEmitAt < 400 && isTyping) return; // debounce for 'typing: true'
      lastTypingEmitAt = now;
      s.emit("typing_set", { roomId: currentRoomRef.current, isTyping });
    },
    [token]
  );

  return { sendMessage, isConnected, joinRoom, leaveRoom, emitTyping };
};
