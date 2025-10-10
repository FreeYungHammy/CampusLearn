import { Storage } from "@google-cloud/storage";
import { env } from "../config/env";
import { createLogger } from "../config/logger";

const logger = createLogger("ThumbnailService");

export class ThumbnailService {
  private static storage: Storage | null = null;

  private static getStorage(): Storage {
    if (this.storage) return this.storage;

    const options: any = {};
    if (env.gcsProjectId) {
      options.projectId = env.gcsProjectId;
    }
    if (env.gcsKeyJson) {
      options.credentials = JSON.parse(env.gcsKeyJson);
    }

    this.storage = new Storage(options);
    return this.storage;
  }

  static async generateThumbnail(
    videoObjectName: string,
  ): Promise<string | null> {
    try {
      // For now, we'll return a placeholder thumbnail URL
      // In a production environment, you would:
      // 1. Use FFmpeg to extract a frame from the video
      // 2. Upload the thumbnail to GCS
      // 3. Return the thumbnail URL

      logger.info(`Generating thumbnail for video: ${videoObjectName}`);

      // Placeholder implementation - return a default video thumbnail
      return this.getDefaultVideoThumbnail();
    } catch (error) {
      logger.error(
        `Failed to generate thumbnail for ${videoObjectName}:`,
        error,
      );
      return this.getDefaultVideoThumbnail();
    }
  }

  private static getDefaultVideoThumbnail(): string {
    // Return a data URL for a simple video icon
    return (
      "data:image/svg+xml;base64," +
      Buffer.from(
        `
      <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="150" fill="#2c3e50"/>
        <polygon points="80,50 80,100 130,75" fill="#ecf0f1"/>
        <text x="100" y="120" text-anchor="middle" fill="#ecf0f1" font-family="Arial" font-size="12">Video</text>
      </svg>
    `,
      ).toString("base64")
    );
  }

  static getDefaultVideoThumbnailStatic(): string {
    return this.getDefaultVideoThumbnail();
  }

  static async getThumbnailUrl(videoObjectName: string): Promise<string> {
    // Check if thumbnail exists in cache
    const { CacheService } = await import("../services/cache.service");
    const cacheKey = `thumbnail:${videoObjectName}`;

    try {
      const cached = await CacheService.get(cacheKey);
      if (cached && typeof cached === "string") {
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache miss for thumbnail ${videoObjectName}`);
    }

    // Generate thumbnail
    const thumbnailUrl = await this.generateThumbnail(videoObjectName);

    // Cache the result
    try {
      await CacheService.set(cacheKey, thumbnailUrl, 3600); // Cache for 1 hour
    } catch (error) {
      logger.warn(`Failed to cache thumbnail for ${videoObjectName}`);
    }

    return thumbnailUrl || this.getDefaultVideoThumbnail();
  }
}
