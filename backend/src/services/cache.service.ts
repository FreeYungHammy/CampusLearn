import { redis } from "../config/redis";
import { createLogger } from "../config/logger";

const logger = createLogger("CacheService");

export const CacheService = {
  async get<T>(key: string, logLevel: 'info' | 'debug' = 'info'): Promise<T | null> {
    const startTime = Date.now();
    try {
      const data = await redis.get(key);
      const duration = Date.now() - startTime;
      if (data) {
        // Only log cache hits in development
        if (process.env.NODE_ENV !== 'production' && logLevel === 'debug') {
          logger.debug(`[CACHE HIT] Key: ${key}, Time: ${duration}ms`);
        }
        return JSON.parse(data) as T;
      }
      // Only log cache misses in development
      if (process.env.NODE_ENV !== 'production' && logLevel === 'info') {
        logger.info(`[CACHE MISS] Key: ${key}, Time: ${duration}ms`);
      }
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
    const startTime = Date.now();
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      const duration = Date.now() - startTime;
      // Only log cache sets in development
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[CACHE SET] Key: ${key}, TTL: ${ttlSeconds}s, Time: ${duration}ms`);
      }
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
