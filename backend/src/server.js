import http from "http";
import app from "./app.js";

// If you wire Socket.IO later, create a server from httpServer and pass it to socket.io
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Example Socket.IO (optional)
// import { Server } from "socket.io";
// const io = new Server(server, { path: process.env.SOCKET_PATH || "/socket.io", cors: { origin: "*"} });
// io.on("connection", (socket) => { console.log("socket connected", socket.id); });

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
