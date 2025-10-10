import { Storage } from "@google-cloud/storage";
import { env } from "../config/env";
import { createLogger } from "../config/logger";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const logger = createLogger("VideoCompressionService");

export interface VideoQuality {
  name: string;
  width: number;
  height: number;
  bitrate: string;
  crf: number;
}

export class VideoCompressionService {
  private static storage: Storage | null = null;

  // Track active compression processes to prevent multiple instances
  private static activeCompressions = new Set<string>();

  private static readonly QUALITIES: VideoQuality[] = [
    { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", crf: 23 },
    { name: "720p", width: 1280, height: 720, bitrate: "2500k", crf: 23 },
    { name: "480p", width: 854, height: 480, bitrate: "1000k", crf: 25 },
    { name: "360p", width: 640, height: 360, bitrate: "500k", crf: 28 },
  ];

  private static getStorage(): Storage {
    if (this.storage) return this.storage;

    let options: any = {};
    if (env.gcsProjectId) {
      options.projectId = env.gcsProjectId;
    }
    if (env.gcsKeyJson) {
      try {
        options.credentials = JSON.parse(env.gcsKeyJson);
      } catch (e) {
        logger.error(
          "Failed to parse GCS_KEYFILE_JSON for video compression:",
          e,
        );
      }
    } else if (env.gcsKeyBase64) {
      try {
        const json = Buffer.from(env.gcsKeyBase64, "base64").toString("utf-8");
        options.credentials = JSON.parse(json);
      } catch (e) {
        logger.error(
          "Failed to parse GCS_KEYFILE_B64 for video compression:",
          e,
        );
      }
    } else if (env.gcsKeyFile) {
      options.keyFilename = env.gcsKeyFile;
    }

    this.storage = new Storage(options);
    return this.storage;
  }

  /**
   * Compress video to multiple qualities
   */
  static async compressVideo(
    inputObjectName: string,
    outputPrefix: string,
  ): Promise<{ [quality: string]: string }> {
    // Check if compression is already running for this video
    if (this.activeCompressions.has(inputObjectName)) {
      logger.info(
        `🚫 Compression already running for ${inputObjectName}, skipping`,
      );
      return {};
    }

    // Mark as active
    this.activeCompressions.add(inputObjectName);
    logger.info(
      `🚀 Starting compression for ${inputObjectName} (${this.activeCompressions.size} active)`,
    );

    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Download original video to temp file
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPaths: { [quality: string]: string } = {};

    try {
      // Download original video
      await bucket.file(inputObjectName).download({ destination: inputPath });
      logger.info(`Downloaded video to ${inputPath}`);

      // Compress to each quality
      for (const quality of this.QUALITIES) {
        const outputPath = path.join(
          tempDir,
          `${outputPrefix}_${quality.name}.mp4`,
        );

        await this.compressToQuality(inputPath, outputPath, quality);

        // Upload compressed version with consistent naming
        // Handle files that already have quality in the name (e.g., "1080p")
        const baseName = inputObjectName
          .replace(/__\d+p__/, "__")
          .replace(".mp4", ""); // Remove existing quality (double underscores)
        const outputObjectName = `${baseName}_${quality.name}.mp4`;

        logger.info(`📁 Creating compressed file: ${outputObjectName}`);
        logger.info(`📁 From base name: ${baseName}`);
        logger.info(`📁 Original input: ${inputObjectName}`);

        await bucket.upload(outputPath, {
          destination: outputObjectName,
          metadata: {
            contentType: "video/mp4",
            cacheControl: "public, max-age=86400",
          },
        });

        outputPaths[quality.name] = outputObjectName;
        logger.info(
          `✅ Compressed and uploaded ${quality.name} version: ${outputObjectName}`,
        );

        // Clean up temp file
        await fs.unlink(outputPath);
      }

      // Clean up input file
      await fs.unlink(inputPath);

      return outputPaths;
    } catch (error) {
      logger.error("Video compression failed:", error);

      // Clean up temp files
      try {
        await fs.unlink(inputPath);
        for (const outputPath of Object.values(outputPaths)) {
          await fs.unlink(outputPath);
        }
      } catch (cleanupError) {
        logger.error("Failed to clean up temp files:", cleanupError);
      }

      throw error;
    } finally {
      // Always remove from active set
      this.activeCompressions.delete(inputObjectName);
      logger.info(
        `🏁 Compression finished for ${inputObjectName} (${this.activeCompressions.size} active)`,
      );
    }
  }

  /**
   * Compress video to specific quality using FFmpeg
   */
  private static async compressToQuality(
    inputPath: string,
    outputPath: string,
    quality: VideoQuality,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-i",
          inputPath,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast", // Much faster compression
          "-crf",
          quality.crf.toString(),
          "-maxrate",
          quality.bitrate,
          "-bufsize",
          `${parseInt(quality.bitrate) * 2}k`,
          "-vf",
          `scale=${quality.width}:${quality.height}`,
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-threads",
          "2", // Limit to 2 threads to reduce CPU usage
          "-movflags",
          "+faststart", // Optimize for web streaming
          "-y", // Overwrite output file
          outputPath,
        ],
        {
          // Set lower priority to reduce system impact
          windowsHide: true,
          detached: false,
        },
      );

      let stderr = "";

      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on("error", (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * Get the best quality URL for a video based on user's connection
   */
  static async getBestQualityUrl(
    videoObjectName: string,
    userConnectionSpeed?: "slow" | "medium" | "fast",
  ): Promise<string> {
    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Determine quality based on connection speed
    let preferredQuality = "480p"; // Default to 480p for faster loading

    if (userConnectionSpeed === "slow") {
      preferredQuality = "360p";
    } else if (userConnectionSpeed === "fast") {
      preferredQuality = "480p"; // Keep 480p even for fast connections
    }

    // Try to find compressed version first - use the CORRECT regex pattern
    // Handle files that already have quality in the name (e.g., "1080p")
    logger.info(`🔍 Original filename: ${videoObjectName}`);

    // Use ONLY the working double underscore pattern
    const baseName = videoObjectName
      .replace(/__\d+p__/, "__")
      .replace(".mp4", ""); // Remove existing quality (double underscores)
    logger.info(`🔍 Base name: ${baseName}`);

    const possibleNames = [
      `${baseName}_${preferredQuality}.mp4`, // Clean base name + quality
      videoObjectName.replace(/__\d+p__/, `__${preferredQuality}__`), // Replace existing quality (double underscores)
      videoObjectName.replace(".mp4", `_${preferredQuality}.mp4`), // Original pattern
    ];

    logger.info(
      `🔍 Looking for compressed ${preferredQuality} version of: ${videoObjectName}`,
    );
    logger.info(`🔍 Base name: ${baseName}`);
    logger.info(`🔍 Possible names: ${possibleNames.join(", ")}`);

    for (const compressedObjectName of possibleNames) {
      try {
        logger.info(`🔍 Checking: ${compressedObjectName}`);
        const [exists] = await bucket.file(compressedObjectName).exists();
        if (exists) {
          logger.info(
            `✅ Found existing compressed ${preferredQuality} version: ${compressedObjectName}`,
          );
          return compressedObjectName;
        } else {
          logger.info(`❌ Not found: ${compressedObjectName}`);
        }
      } catch (error) {
        logger.warn(`❌ Error checking ${compressedObjectName}: ${error}`);
      }
    }

    // Fallback to original
    logger.info(
      `No compressed version found, returning original: ${videoObjectName}`,
    );
    return videoObjectName;
  }

  /**
   * Generate HLS playlist for adaptive streaming
   */
  static async generateHLSPlaylist(
    videoObjectName: string,
    outputPrefix: string,
  ): Promise<string> {
    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Generate HLS segments for each quality
    const qualities = ["1080p", "720p", "480p", "360p"];
    const playlistContent: string[] = [];

    playlistContent.push("#EXTM3U");
    playlistContent.push("#EXT-X-VERSION:3");

    for (const quality of qualities) {
      const compressedObjectName = `${outputPrefix}_${quality}.mp4`;

      try {
        const [exists] = await bucket.file(compressedObjectName).exists();
        if (exists) {
          const bitrate =
            this.QUALITIES.find((q) => q.name === quality)?.bitrate || "1000k";
          playlistContent.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(bitrate) * 1000},RESOLUTION=${this.QUALITIES.find((q) => q.name === quality)?.width}x${this.QUALITIES.find((q) => q.name === quality)?.height}`,
          );
          playlistContent.push(`${compressedObjectName}`);
        }
      } catch (error) {
        logger.warn(`Quality ${quality} not available: ${error}`);
      }
    }

    // Upload playlist
    const playlistObjectName = `${outputPrefix}.m3u8`;
    const file = bucket.file(playlistObjectName);
    await file.save(playlistContent.join("\n"), {
      metadata: {
        contentType: "application/vnd.apple.mpegurl",
        cacheControl: "public, max-age=300", // 5 minutes cache for playlist
      },
    });

    return playlistObjectName;
  }
}
