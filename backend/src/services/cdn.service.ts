import { Storage } from "@google-cloud/storage";
import { env } from "../config/env";
import { createLogger } from "../config/logger";

const logger = createLogger("CDNService");

export interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  cacheTtl: number;
  provider: string;
}

export class CDNService {
  private static instance: CDNService;
  private config: CDNConfig;
  private storage: Storage | null = null;

  private constructor() {
    this.config = {
      enabled: env.cdnEnabled,
      baseUrl: env.cdnBaseUrl,
      cacheTtl: env.cdnCacheTtl,
      provider: env.cdnProvider,
    };
  }

  static getInstance(): CDNService {
    if (!this.instance) {
      this.instance = new CDNService();
    }
    return this.instance;
  }

  /**
   * Check if CDN is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.baseUrl;
  }

  /**
   * Get CDN URL for a video file
   */
  getCDNUrl(objectName: string, quality?: string): string {
    if (!this.isEnabled()) {
      logger.warn("CDN is not enabled or configured");
      return "";
    }

    // Construct CDN URL
    let cdnPath = `/videos/${objectName}`;

    // Add quality parameter if specified
    if (quality && quality !== "1080p") {
      cdnPath += `?quality=${quality}`;
    }

    const cdnUrl = `${this.config.baseUrl}${cdnPath}`;
    logger.info(`CDN URL generated: ${cdnUrl}`);
    return cdnUrl;
  }

  /**
   * Get optimized CDN URL with cache headers
   */
  getOptimizedCDNUrl(
    objectName: string,
    quality?: string,
    range?: string,
  ): string {
    const baseUrl = this.getCDNUrl(objectName, quality);

    if (!baseUrl) return "";

    // Add range parameter for video streaming
    const params = new URLSearchParams();
    if (range) {
      params.set("range", range);
    }

    // Add cache control hints
    params.set("cache", "true");
    params.set("ttl", this.config.cacheTtl.toString());

    const optimizedUrl = `${baseUrl}${params.toString() ? "&" + params.toString() : ""}`;
    logger.info(`Optimized CDN URL: ${optimizedUrl}`);
    return optimizedUrl;
  }

  /**
   * Invalidate CDN cache for a specific video
   */
  async invalidateCache(objectName: string): Promise<boolean> {
    if (!this.isEnabled()) {
      logger.warn("CDN cache invalidation skipped - CDN not enabled");
      return false;
    }

    try {
      // For Google Cloud CDN, we would use the Cloud CDN API
      // For now, we'll log the invalidation request
      logger.info(`CDN cache invalidation requested for: ${objectName}`);

      // TODO: Implement actual CDN cache invalidation
      // This would typically involve calling the CDN provider's API

      return true;
    } catch (error) {
      logger.error("CDN cache invalidation failed:", error);
      return false;
    }
  }

  /**
   * Get CDN statistics and health
   */
  async getCDNStats(): Promise<{
    enabled: boolean;
    provider: string;
    baseUrl: string;
    cacheTtl: number;
    health: "healthy" | "degraded" | "unhealthy";
  }> {
    return {
      enabled: this.isEnabled(),
      provider: this.config.provider,
      baseUrl: this.config.baseUrl,
      cacheTtl: this.config.cacheTtl,
      health: this.isEnabled() ? "healthy" : "unhealthy",
    };
  }

  /**
   * Preload video content to CDN cache
   */
  async preloadVideo(
    objectName: string,
    qualities: string[] = ["1080p", "720p", "480p"],
  ): Promise<void> {
    if (!this.isEnabled()) {
      logger.warn("CDN preloading skipped - CDN not enabled");
      return;
    }

    try {
      logger.info(`Preloading video to CDN: ${objectName}`);

      for (const quality of qualities) {
        const cdnUrl = this.getCDNUrl(objectName, quality);
        if (cdnUrl) {
          // In a real implementation, you would make a HEAD request to warm the cache
          logger.info(`Preloading quality ${quality}: ${cdnUrl}`);
        }
      }
    } catch (error) {
      logger.error("CDN preloading failed:", error);
    }
  }

  /**
   * Get fallback URL if CDN fails
   */
  getFallbackUrl(objectName: string): string {
    // Return direct GCS URL as fallback
    return `https://storage.googleapis.com/${env.gcsBucket}/${objectName}`;
  }

  /**
   * Check if a URL is a CDN URL
   */
  isCDNUrl(url: string): boolean {
    return this.isEnabled() && url.startsWith(this.config.baseUrl);
  }

  /**
   * Extract object name from CDN URL
   */
  extractObjectNameFromCDNUrl(cdnUrl: string): string | null {
    if (!this.isCDNUrl(cdnUrl)) {
      return null;
    }

    try {
      const url = new URL(cdnUrl);
      const pathParts = url.pathname.split("/");
      const videoIndex = pathParts.indexOf("videos");

      if (videoIndex !== -1 && pathParts[videoIndex + 1]) {
        return pathParts.slice(videoIndex + 1).join("/");
      }
    } catch (error) {
      logger.error("Failed to extract object name from CDN URL:", error);
    }

    return null;
  }
}
