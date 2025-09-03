try {
  require("dotenv").config();
} catch {}

import http from "http";
import app from "./app.js";

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0"; // explicit for Docker

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  const hostPort = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`API listening (container): http://${HOST}:${PORT}`);
  console.log(`API reachable (host):     ${hostPort}`);
});

// basic hardening
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

// clean shutdowns in containers
const shutdown = (sig: NodeJS.Signals) => () => {
  console.log(`\nReceived ${sig}. Closing server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
