import Redis, { type Redis as RedisType } from "ioredis";
import { env } from "./env";
import { createLogger } from "./logger";

const logger = createLogger("Redis");

let redis: RedisType;

if (env.nodeEnv !== 'test') {
  redis = new Redis(env.redisUrl, {
    // Add TLS for cloud connections, but allow disabling for local dev
    tls: env.redisUrl.startsWith("rediss://") ? {} : undefined,
    // Retry strategy for better resilience
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      logger.info(
        `Redis connection retry attempt ${times}, retrying in ${delay}ms`,
      );
      return delay;
    },
  });

  redis.on("connect", () => logger.info("Connected to Redis"));
  redis.on("error", (err) => logger.error("Redis Client Error", err));
} else {
  // In test environment, use a mock that does nothing.
  redis = {
    get: () => Promise.resolve(null),
    setex: () => Promise.resolve('OK'),
    del: () => Promise.resolve(1),
    on: () => {},
    // Add any other methods your app uses
  } as any;
}

export { redis };
