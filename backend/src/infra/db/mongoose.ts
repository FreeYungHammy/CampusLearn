import mongoose from "mongoose";
import { env } from "../../config/env";
import { createLogger } from "../../config/logger";

const logger = createLogger("mongoose");

export async function connectMongo(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI not set");
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri, {
      // options can be added if needed
    });
    logger.info(`Connected to MongoDB`);
  } catch (err) {
    logger.error(`MongoDB connection error`, err as Error);
    throw err;
  }

  mongoose.connection.on("disconnected", (err) =>
    logger.warn("MongoDB disconnected", err),
  );
  mongoose.connection.on("reconnected", () =>
    logger.info("MongoDB reconnected"),
  );
}
