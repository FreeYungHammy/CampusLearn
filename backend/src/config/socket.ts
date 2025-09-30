import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { ChatService } from "../modules/chat/chat.service";
import { verifyJwt } from "../auth/jwt";
import { CacheService } from "../services/cache.service";

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
const connectedUsers = new Map<string, { socketId: string; userId: string; lastSeen: Date }>();

export function createSocketServer(httpServer: HttpServer) {
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io", // client uses default path too; keep in sync if you change it
    maxHttpBufferSize: 15e6, // 15 MB
    transports: ["websocket", "polling"],
    allowUpgrades: true,
    cors: {
      origin: allowed.length
        ? allowed
        : [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://localhost:5001",
          ],
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
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Check if token is blacklisted
      const isBlacklisted = await CacheService.get(`jwt:blacklist:${token}`);
      if (isBlacklisted) {
        return next(new Error('Authentication error: Token has been revoked'));
      }

      const payload = verifyJwt(token);
      if (!payload) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      // Attach user info to socket
      socket.data.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role
      };

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  chat.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    console.log(
      "Backend: New client connected to /chat namespace. Socket ID:",
      socket.id,
      "User:",
      userId
    );

    // Track connected user
    if (userId) {
      connectedUsers.set(userId, {
        socketId: socket.id,
        userId: userId,
        lastSeen: new Date()
      });
      
      // Emit user online status to all connected clients
      chat.emit('user_status_change', {
        userId: userId,
        status: 'online',
        lastSeen: new Date()
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
            messageSenderId: data.senderId
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
        if (ack) ack({ ok: false, error: e instanceof Error ? e.message : "Send failed" });
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.user?.id;
      console.log("user disconnected from /chat", socket.id, "User:", userId);
      
      // Remove user from connected users and emit offline status
      if (userId) {
        connectedUsers.delete(userId);
        
        // Emit user offline status to all connected clients
        chat.emit('user_status_change', {
          userId: userId,
          status: 'offline',
          lastSeen: new Date()
        });
      }
    });
  });

  return io;
}

// Function to get user online status
export function getUserOnlineStatus(userId: string): { isOnline: boolean; lastSeen?: Date } {
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
