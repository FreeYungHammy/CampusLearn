// Production-ready logging for video streaming
export class VideoLoggingService {
  static logVideoStart(videoId: string, quality: string, userAgent: string) {
    console.log(`🎬 Video started: ${videoId} (${quality}) - ${userAgent}`);
  }

  static logVideoEnd(videoId: string, duration: number, quality: string) {
    console.log(`✅ Video completed: ${videoId} (${duration}s, ${quality})`);
  }

  static logInitialChunkOptimization(
    videoId: string,
    originalSize: number,
    optimizedSize: number,
  ) {
    console.log(
      `⚡ Initial chunk optimized: ${videoId} (${originalSize} → ${optimizedSize} bytes)`,
    );
  }

  static logVideoError(videoId: string, error: string) {
    console.error(`❌ Video error: ${videoId} - ${error}`);
  }

  static logQualityChange(
    videoId: string,
    fromQuality: string,
    toQuality: string,
  ) {
    console.log(
      `🔄 Quality changed: ${videoId} (${fromQuality} → ${toQuality})`,
    );
  }
}
