import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { ChatService } from "../modules/chat/chat.service";
import { verifyJwt } from "../auth/jwt";
import { CacheService } from "../services/cache.service";
import { env } from "./env";

type SendMessagePayload = {
  chatId: string;
  content: string;
  senderId: string;
  receiverId: string;
  upload?: {
    data: string;
    contentType: string;
    filename: string;
  };
};

let io: Server;

// Track connected users
const connectedUsers = new Map<
  string,
  { socketId: string; userId: string; lastSeen: Date }
>();

export function createSocketServer(httpServer: HttpServer) {
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io", // client uses default path too; keep in sync if you change it
    maxHttpBufferSize: 10e6, // 10 MB (reduced from 15MB)
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    cors: {
      origin: allowed.length ? allowed : env.corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.engine.on("connection_error", (err) => {
    console.error("engine.io connection_error:", {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  // Keep default-namespace demo handlers if you actually use them elsewhere.
  io.on("connection", (socket) => {
    console.log(
      "Backend: New client connected to main namespace. Socket ID:",
      socket.id,
    );
    socket.on("messages:get", ({ peerId }) => {
      io.to(socket.id).emit("messages:history", []);
    });
    socket.on("join_thread", (threadId: string) => {
      socket.join(threadId);
    });
    socket.on("message:send", (msg: unknown) => {
      io.emit("message:receive", msg);
    });
  });

  const chat = io.of("/chat");

  // Add authentication middleware to chat namespace
  chat.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Check if token is blacklisted
      const isBlacklisted = await CacheService.get(`jwt:blacklist:${token}`);
      if (isBlacklisted) {
        return next(new Error("Authentication error: Token has been revoked"));
      }

      const payload = verifyJwt(token);
      if (!payload) {
        return next(
          new Error("Authentication error: Invalid or expired token"),
        );
      }

      // Attach user info to socket
      socket.data.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  chat.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    console.log(
      "Backend: New client connected to /chat namespace. Socket ID:",
      socket.id,
      "User:",
      userId,
    );

    // Track connected user
    if (userId) {
      connectedUsers.set(userId, {
        socketId: socket.id,
        userId: userId,
        lastSeen: new Date(),
      });

      // Emit user online status to all connected clients
      chat.emit("user_status_change", {
        userId: userId,
        status: "online",
        lastSeen: new Date(),
      });
    }

    socket.on("join_room", (chatId: string) => {
      socket.join(chatId);
      console.log(`joined room: ${chatId}`);
    });

    socket.on("leave_room", (chatId: string) => {
      socket.leave(chatId);
      console.log(`left room: ${chatId}`);
    });

    socket.on("send_message", async (data: SendMessagePayload, ack) => {
      try {
        // Validate that the senderId matches the authenticated user
        if (data.senderId !== socket.data.user?.id) {
          console.error("Unauthorized message send attempt:", {
            socketUserId: socket.data.user?.id,
            messageSenderId: data.senderId,
          });
          if (ack) ack({ ok: false, error: "Unauthorized" });
          return;
        }

        // Save message to database and emit to room
        const savedMessage = await ChatService.send(data);

        // Send acknowledgment back to sender
        if (ack) ack({ ok: true, message: savedMessage });
      } catch (e) {
        console.error("send_message failed:", e);
        if (ack)
          ack({
            ok: false,
            error: e instanceof Error ? e.message : "Send failed",
          });
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.user?.id;
      console.log("user disconnected from /chat", socket.id, "User:", userId);

      // Remove user from connected users and emit offline status
      if (userId) {
        connectedUsers.delete(userId);

        // Emit user offline status to all connected clients
        chat.emit("user_status_change", {
          userId: userId,
          status: "offline",
          lastSeen: new Date(),
        });
      }
    });
  });

  /* ---------- VIDEO NAMESPACE (WebRTC signaling) ---------- */
  const video = io.of("/video");
  // Lazy imports to avoid circular deps at module load time
  // Presence + rate limiting helpers
  let presence: typeof import("../realtime/presence.service");
  let rateLimit: typeof import("../realtime/rateLimit.service");
  (async () => {
    presence = await import("../realtime/presence.service");
    rateLimit = await import("../realtime/rateLimit.service");
  })();

  // Reuse JWT auth for /video namespace
  video.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error: No token provided'));

      const isBlacklisted = await CacheService.get(`jwt:blacklist:${token}`);
      if (isBlacklisted) return next(new Error('Authentication error: Token has been revoked'));

      const payload = verifyJwt(token);
      if (!payload) return next(new Error('Authentication error: Invalid or expired token'));

      socket.data.user = { id: payload.id, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  video.on("connection", (socket) => {
    const userId = socket.data.user?.id as string | undefined;
    if (userId) {
      connectedUsers.set(userId, { socketId: socket.id, userId, lastSeen: new Date() });
    }

    // join_call: client joins a signaling room for a given callId
    // payload: { callId: string }
    socket.on("join_call", async ({ callId, role }: { callId: string; role?: "tutor"|"student"|"guest" }) => {
      console.log("[/video] join_call", { socket: socket.id, userId, callId, role });
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:join")) return;
      socket.join(callId);
      if (userId && presence) {
        await presence.markSocketOnline(userId, socket.id);
        await presence.addMemberToRoom(callId, userId);
      }
      // Persist lifecycle (best-effort, non-blocking on errors)
      try {
        const { CallService } = await import("../realtime/call.service");
        await CallService.startCall(callId, userId || "unknown");
        if (userId) await CallService.joinCall(callId, userId, role || "guest");
      } catch {}
      socket.to(callId).emit("peer_joined", { userId });
    });

    // initiate_call: start a call and notify the other participant
    socket.on("initiate_call", async ({ callId, targetUserId }: { callId: string; targetUserId: string }) => {
      console.log("[/video] initiate_call", { socket: socket.id, userId, callId, targetUserId });
      if (!callId || !targetUserId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:initiate")) return;
      
      // Find the target user's socket
      const targetUser = connectedUsers.get(targetUserId);
      if (targetUser) {
        // Get the caller's name from the database
        let fromUserName = "User";
        try {
          const { UserService } = await import("../modules/users/user.service");
          const { UserRepo } = await import("../modules/users/user.repo");
          
          // First get the user to determine their role
          const user = await UserRepo.findById(userId || "");
          if (user) {
            // Get the profile based on role
            const profile = await UserService.getProfileByRole(user.id, user.role);
            if (profile && profile.name) {
              fromUserName = `${profile.name || ""} ${profile.surname || ""}`.trim() || "User";
            }
          }
        } catch (error) {
          console.error("Failed to get caller name:", error);
        }
        
        // Send notification to target user
        io.to(targetUser.socketId).emit("incoming_call", {
          callId,
          fromUserId: userId,
          fromUserName,
        });
      }
    });

    // decline_call: handle call decline
    socket.on("decline_call", ({ callId, fromUserId }: { callId: string; fromUserId: string }) => {
      console.log("[/video] decline_call", { socket: socket.id, userId, callId, fromUserId });
      if (!callId || !fromUserId) return;
      
      // Notify the caller that the call was declined
      const caller = connectedUsers.get(fromUserId);
      if (caller) {
        io.to(caller.socketId).emit("call_cancelled", { callId });
      }
    });

    // signal: relay offer/answer/ice to peers in room
    // payload: { callId: string, data: { type: 'offer'|'answer'|'candidate', sdp?, candidate? } }
    socket.on("signal", ({ callId, data }: { callId: string; data: unknown }) => {
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:signal")) return;
      console.log("[/video] signal", { socket: socket.id, type: (data as any)?.type, callId });
      socket.to(callId).emit("signal", { fromUserId: userId, data });
    });

    // leave_call: remove from room and notify others
    // payload: { callId: string }
    socket.on("leave_call", async ({ callId }: { callId: string }) => {
      console.log("[/video] leave_call", { socket: socket.id, userId, callId });
      if (!callId) return;
      if (!rateLimit || !rateLimit.allowEvent(socket.id, "video:leave")) return;
      socket.leave(callId);
      if (userId && presence) {
        await presence.removeMemberFromRoom(callId, userId);
      }
      try {
        if (userId) {
          const { CallService } = await import("../realtime/call.service");
          await CallService.leaveCall(callId, userId);
        }
      } catch {}
      socket.to(callId).emit("peer_left", { userId });
    });

    socket.on("disconnect", async () => {
      if (userId) {
        connectedUsers.delete(userId);
        if (presence) await presence.markSocketOffline(userId, socket.id);
      }
    });
  });

  return io;
}

// Function to get user online status
export function getUserOnlineStatus(userId: string): {
  isOnline: boolean;
  lastSeen?: Date;
} {
  const user = connectedUsers.get(userId);
  if (user) {
    return { isOnline: true, lastSeen: user.lastSeen };
  }
  return { isOnline: false };
}

// Function to get all connected users
export function getConnectedUsers(): string[] {
  return Array.from(connectedUsers.keys());
}

export { io };
