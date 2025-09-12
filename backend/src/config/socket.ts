import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

export function createSocketServer(httpServer: HttpServer) {
  const allowed = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io",
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

  // Log low-level engine errors (useful when upgrade is refused)
  io.engine.on("connection_error", (err) => {
    console.error("engine.io connection_error:", {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  io.on("connection", (socket) => {
    // history request
    socket.on("messages:get", ({ peerId }) => {
      // TODO: replace with DB fetch; send back array
      io.to(socket.id).emit("messages:history", []);
    });

    // send message
    socket.on("join_thread", (threadId) => {
      socket.join(threadId);
    });

    socket.on("message:send", (msg) => {
      // echo to recipient and sender (rooming or direct lookup can be added)
      io.emit("message:receive", msg);
    });
  });

  return io;
}

export { io };
