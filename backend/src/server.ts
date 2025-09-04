try {
  require("dotenv").config();
} catch {}

import http from "http";
import app from "./app";
import { createSocketServer } from "./config/socket";

const port = process.env.PORT || 8080;

const server = http.createServer(app);

// Initialize Socket.IO
createSocketServer(server);

server.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});

// Basic hardening
server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

process.on("unhandledRejection", (r) => {
  console.error("Unhandled rejection:", r);
  process.exit(1);
});

process.on("uncaughtException", (e) => {
  console.error("Uncaught exception:", e);
  process.exit(1);
});

// Clean shutdowns in containers
const shutdown = (sig: NodeJS.Signals) => () => {
  console.log(`\nReceived ${sig}. Closing server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
