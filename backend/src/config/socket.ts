import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

interface User {
  userId: string;
  socketId: string;
}

let onlineUsers: User[] = [];

const addUser = (userId: string, socketId: string) => {
  !onlineUsers.some((user) => user.userId === userId) &&
    onlineUsers.push({ userId, socketId });
};

const removeUser = (socketId: string) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const getUser = (userId: string) => {
  return onlineUsers.find((user) => user.userId === userId);
};

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:8080"], // Your frontend URL
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listener for a new user connecting
    socket.on("newUser", (userId: string) => {
      addUser(userId, socket.id);
      console.log("Online users:", onlineUsers);
    });

    // Listener for sending a message
    socket.on("sendMessage", ({ recipientId, message }) => {
      const recipient = getUser(recipientId);
      if (recipient) {
        io.to(recipient.socketId).emit("getMessage", message);
      }
    });

    // Listener for when a user disconnects
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      removeUser(socket.id);
    });
  });

  return io;
};
