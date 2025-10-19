import mongoose from "mongoose";
import { env } from "../../config/env";
import { createLogger } from "../../config/logger";

const logger = createLogger("mongoose");

export async function connectMongo(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI not set");
  }

  mongoose.set("strictQuery", true);
  
  // Reduce MongoDB connection logging verbosity
  mongoose.set('debug', false);

  try {
    // Configure mongoose settings before connecting
    mongoose.set('bufferCommands', false);
    
    // Add Atlas-optimized connection pooling parameters to URI
    let mongoUri = env.mongoUri;
    if (mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb://')) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Environment-specific connection pooling parameters
      const poolParams = [
        `maxPoolSize=${isProduction ? '15' : '5'}`,     // Higher pool for production
        `minPoolSize=${isProduction ? '3' : '1'}`,      // More persistent connections in prod
        `maxIdleTimeMS=${isProduction ? '600000' : '30000'}`, // 10min prod, 30sec dev
        'serverSelectionTimeoutMS=5000',
        'socketTimeoutMS=45000',
        'connectTimeoutMS=10000',
        'heartbeatFrequencyMS=10000', // Heartbeat every 10 seconds
        'compressors=zlib'           // Enable compression for Atlas
      ].filter(param => !mongoUri.includes(param.split('=')[0] + '=')).join('&');
      
      if (poolParams) {
        mongoUri = mongoUri.includes('?') 
          ? `${mongoUri}&${poolParams}`
          : `${mongoUri}?${poolParams}`;
      }
    }
    
    await mongoose.connect(mongoUri, {
      bufferCommands: false, // Disable mongoose buffering
    });
    
    const isProduction = process.env.NODE_ENV === 'production';
    logger.info(`Connected to MongoDB Atlas with ${isProduction ? 'production' : 'development'} optimized connection pooling`);
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
  
  // Production-optimized connection monitoring
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // Development: Verbose logging
    mongoose.connection.on("connected", () => {
      logger.info(`MongoDB connected - ReadyState: ${mongoose.connection.readyState}`);
    });
    
    let connectionCount = 0;
    mongoose.connection.on("connectionCreated", (event) => {
      connectionCount++;
      logger.info(`MongoDB connection #${connectionCount} created: ${event.connectionId}`);
    });
    
    mongoose.connection.on("connectionClosed", (event) => {
      logger.info(`MongoDB connection closed: ${event.connectionId}`);
    });
    
    // Log connection status periodically in development (reduced frequency)
    setInterval(() => {
      logger.info(`MongoDB Connection Status: ReadyState=${mongoose.connection.readyState}, Host=${mongoose.connection.host}, Port=${mongoose.connection.port}`);
    }, 300000); // 5 minutes instead of 30 seconds
  } else {
    // Production: Minimal logging
    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected");
    });
  }
}
