import { redis } from "../config/redis";
import { createLogger } from "../config/logger";

const logger = createLogger("CacheService");

export const CacheService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (data) {
        // logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(data) as T;
      }
      // logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Error getting from cache for key ${key}:`, error);
      return null; // Fail gracefully
    }
  },

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    logger.info(`Attempting to set cache for key: ${key}`);
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      logger.debug(`Cache set for key: ${key} with TTL: ${ttlSeconds}s`);
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, error);
      // Fail gracefully
    }
  },

  async del(key: string | string[]): Promise<void> {
    try {
      const keysToDelete = Array.isArray(key) ? key : [key];
      if (keysToDelete.length === 0) return;

      await redis.del(keysToDelete);
      logger.debug(`Cache deleted for keys: ${keysToDelete.join(", ")}`);
    } catch (error) {
      logger.error(`Error deleting from cache for keys ${key}:`, error);
      // Fail gracefully
    }
  },

  // Alias for convenience
  async setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600,
  ): Promise<void> {
    return this.set(key, value, ttlSeconds);
  },

  async getJson<T>(key: string): Promise<T | null> {
    return this.get(key);
  },
};
