/**
 * Video performance monitoring utility
 * Tracks video loading metrics and performance
 */

export interface VideoMetrics {
  loadStartTime: number;
  firstFrameTime: number;
  totalLoadTime: number;
  bytesLoaded: number;
  quality: string;
  connectionSpeed: string;
  errors: string[];
}

export class VideoPerformanceMonitor {
  private static instance: VideoPerformanceMonitor;
  private metrics: Map<string, VideoMetrics> = new Map();

  static getInstance(): VideoPerformanceMonitor {
    if (!this.instance) {
      this.instance = new VideoPerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Start tracking video performance
   */
  startTracking(
    videoId: string,
    quality: string,
    connectionSpeed: string,
  ): void {
    this.metrics.set(videoId, {
      loadStartTime: performance.now(),
      firstFrameTime: 0,
      totalLoadTime: 0,
      bytesLoaded: 0,
      quality,
      connectionSpeed,
      errors: [],
    });
  }

  /**
   * Record when first frame is displayed
   */
  recordFirstFrame(videoId: string): void {
    const metric = this.metrics.get(videoId);
    if (metric) {
      metric.firstFrameTime = performance.now();
      metric.totalLoadTime = metric.firstFrameTime - metric.loadStartTime;

      // Log performance metrics
      console.log(`Video ${videoId} performance:`, {
        totalLoadTime: `${metric.totalLoadTime.toFixed(2)}ms`,
        quality: metric.quality,
        connectionSpeed: metric.connectionSpeed,
      });
    }
  }

  /**
   * Record error
   */
  recordError(videoId: string, error: string): void {
    const metric = this.metrics.get(videoId);
    if (metric) {
      metric.errors.push(error);
      console.error(`Video ${videoId} error:`, error);
    }
  }

  /**
   * Get performance metrics for a video
   */
  getMetrics(videoId: string): VideoMetrics | undefined {
    return this.metrics.get(videoId);
  }

  /**
   * Get average performance across all videos
   */
  getAveragePerformance(): {
    averageLoadTime: number;
    errorRate: number;
    qualityDistribution: { [quality: string]: number };
  } {
    const metrics = Array.from(this.metrics.values());

    if (metrics.length === 0) {
      return {
        averageLoadTime: 0,
        errorRate: 0,
        qualityDistribution: {},
      };
    }

    const totalLoadTime = metrics.reduce((sum, m) => sum + m.totalLoadTime, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors.length, 0);

    const qualityDistribution: { [quality: string]: number } = {};
    metrics.forEach((m) => {
      qualityDistribution[m.quality] =
        (qualityDistribution[m.quality] || 0) + 1;
    });

    return {
      averageLoadTime: totalLoadTime / metrics.length,
      errorRate: totalErrors / metrics.length,
      qualityDistribution,
    };
  }

  /**
   * Clear old metrics (keep only last 100 videos)
   */
  cleanup(): void {
    if (this.metrics.size > 100) {
      const entries = Array.from(this.metrics.entries());
      const toKeep = entries.slice(-50); // Keep last 50
      this.metrics.clear();
      toKeep.forEach(([key, value]) => this.metrics.set(key, value));
    }
  }
}
