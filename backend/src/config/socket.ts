import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { ChatService } from "../modules/chat/chat.service";

type SendMessagePayload = {
  chatId: string;
  content: string;
  senderId: string;
};

let io: Server;

export function createSocketServer(httpServer: HttpServer) {
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io", // client uses default path too; keep in sync if you change it
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

  chat.on("connection", (socket) => {
    console.log(
      "Backend: New client connected to /chat namespace. Socket ID:",
      socket.id,
    );

    socket.on("join_room", (chatId: string) => {
      socket.join(chatId);
      console.log(`joined room: ${chatId}`);
    });

    socket.on("send_message", async (data: SendMessagePayload) => {
      try {
        await ChatService.processAndEmitChatMessage(data);
      } catch (e) {
        console.error("send_message failed:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("user disconnected from /chat", socket.id);
    });
  });

  return io;
}

export { io };
