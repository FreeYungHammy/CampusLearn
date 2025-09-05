// server.ts
try {
  require("dotenv").config();
} catch {}

import http from "http";
import app from "./app"; // make sure app.ts default-exports the Express app
import { createSocketServer } from "./config/socket";
import { connectMongo } from "./infra/db/mongoose";
import { env } from "./config/env";
import { createLogger } from "./config/logger";
import mongoose from "mongoose";

const logger = createLogger("server");
const port = Number(process.env.PORT ?? env.port ?? 8080);

// Build HTTP server first (so we can attach Socket.IO to it)
const server = http.createServer(app);

// Attach Socket.IO and keep a handle for shutdown
const io = createSocketServer(server);

async function start() {
  try {
    // If you’ve currently connected in app.ts, remove that and do it here instead:
    await connectMongo();

    server.listen(port, () => {
      logger.info(`🚀 Server listening at http://localhost:${port}`);
    });
  } catch (err) {
    logger.error(`Fatal start error: ${(err as Error).message}`);
    process.exit(1);
  }
}

start();

// Basic hardening
server.on("error", (err) => {
  logger.error(`Server error: ${(err as Error).message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled rejection: ${String(reason)}`);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught exception: ${(err as Error).message}`);
  process.exit(1);
});

// Clean shutdowns (Docker/K8s friendly)
const shutdown = (sig: NodeJS.Signals) => async () => {
  logger.info(`Received ${sig}. Closing server...`);
  try {
    // Stop accepting new connections
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Close socket server
    io.close();

    // Close Mongo
    await mongoose.connection.close();

    logger.info("Shutdown complete. Bye!");
    process.exit(0);
  } catch (e) {
    logger.error(`Error during shutdown: ${(e as Error).message}`);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
