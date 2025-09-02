import "dotenv/config";
import http from "http";
import app from "./app.js";

const PORT = Number(process.env.PORT || 5000);

const server = http.createServer(app);

// Socket.IO (optional later):
// import { Server } from "socket.io";
// const io = new Server(server, { path: process.env.SOCKET_PATH || "/socket.io", cors: { origin: "*" } });
// io.on("connection", (socket) => { console.log("socket connected", socket.id); });

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
