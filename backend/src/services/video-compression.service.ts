import { Storage } from "@google-cloud/storage";
import { env } from "../config/env";
import { createLogger } from "../config/logger";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import os from "os";
import { FileModel } from "../schemas/tutorUpload.schema";

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
    specificQualities?: string[],
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

    // Update database to show compression is starting
    await this.updateCompressionStatus(inputObjectName, "compressing");

    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Check if input file exists
    try {
      const [exists] = await bucket.file(inputObjectName).exists();
      if (!exists) {
        logger.error(`❌ Input file does not exist: ${inputObjectName}`);
        this.activeCompressions.delete(inputObjectName);
        throw new Error(`Input file does not exist: ${inputObjectName}`);
      }
      logger.info(`✅ Input file exists: ${inputObjectName}`);
    } catch (error) {
      logger.error(`❌ Error checking input file: ${error}`);
      this.activeCompressions.delete(inputObjectName);
      throw error;
    }

    // Download original video to temp file
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPaths: { [quality: string]: string } = {};

    try {
      // Download original video
      logger.info(`📥 Downloading video from GCS: ${inputObjectName}`);
      await bucket.file(inputObjectName).download({ destination: inputPath });
      logger.info(`✅ Downloaded video to ${inputPath}`);

      // Check if file was actually downloaded
      if (!fsSync.existsSync(inputPath)) {
        throw new Error(`Download failed: file not found at ${inputPath}`);
      }

      const stats = fsSync.statSync(inputPath);
      logger.info(`📊 Downloaded file size: ${stats.size} bytes`);

      if (stats.size === 0) {
        throw new Error(`Download failed: file is empty`);
      }

      // Compress to each quality
      const qualitiesToCompress = specificQualities
        ? this.QUALITIES.filter((q) => specificQualities.includes(q.name))
        : this.QUALITIES;

      logger.info(
        `🎬 Compressing to qualities: ${qualitiesToCompress.map((q) => q.name).join(", ")}`,
      );

      for (const quality of qualitiesToCompress) {
        const outputPath = path.join(
          tempDir,
          `${outputPrefix}_${quality.name}.mp4`,
        );

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        logger.info(`📁 Created output directory: ${outputDir}`);

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

      // Update database to show compression completed
      await this.updateCompressionStatus(inputObjectName, "completed", Object.keys(outputPaths));

      return outputPaths;
    } catch (error) {
      logger.error("Video compression failed:", error);

      // Update database to show compression failed
      await this.updateCompressionStatus(inputObjectName, "failed");

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
    requestedQuality?: string,
  ): Promise<string> {
    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Determine quality based on connection speed or requested quality
    let preferredQuality = "480p"; // Default to 480p for faster loading

    if (requestedQuality) {
      // Use the specifically requested quality
      preferredQuality = requestedQuality;
      logger.info(`🎯 Using requested quality: ${preferredQuality}`);
    } else if (userConnectionSpeed === "slow") {
      preferredQuality = "360p";
    } else if (userConnectionSpeed === "fast") {
      preferredQuality = "480p"; // Keep 480p even for fast connections
    }

    // Try to find compressed version first - use the CORRECT regex pattern
    // Handle files that already have quality in the name (e.g., "1080p")
    logger.info(`🔍 Final preferred quality: ${preferredQuality}`);
    logger.info(`🔍 Original filename: ${videoObjectName}`);

    // Extract base name by removing any existing quality suffix
    const baseName = videoObjectName
      .replace(/_\d+p\.mp4$/, ".mp4") // Remove existing quality suffix like _480p.mp4
      .replace(/__\d+p__\.mp4$/, ".mp4") // Remove double underscore pattern with .mp4
      .replace(/__\d+p__/, "__") // Remove double underscore pattern without .mp4
      .replace(".mp4", ""); // Remove .mp4 extension
    logger.info(`🔍 Base name: ${baseName}`);

    const possibleNames = [
      `${baseName}_${preferredQuality}.mp4`, // Most common pattern: base_quality.mp4
      `${baseName}__${preferredQuality}__.mp4`, // Double underscore pattern
      videoObjectName.replace(/_\d+p\.mp4$/, `_${preferredQuality}.mp4`), // Replace existing quality
      videoObjectName.replace(/__\d+p__/, `__${preferredQuality}__`), // Replace double underscore
    ];

    logger.info(
      `🔍 Looking for compressed ${preferredQuality} version of: ${videoObjectName}`,
    );
    logger.info(`🔍 Base name: ${baseName}`);
    logger.info(`🔍 Possible names: ${possibleNames.join(", ")}`);

    // Debug: List files in the bucket to see what's actually there
    try {
      const [files] = await bucket.getFiles({
        prefix: baseName.split("/").slice(0, -1).join("/"),
      });
      const fileNames = files
        .map((file) => file.name)
        .filter((name) => name.includes(baseName.split("/").pop() || ""));
      logger.info(
        `🔍 Files in bucket with similar names: ${fileNames.join(", ")}`,
      );
    } catch (error) {
      logger.warn(`🔍 Could not list bucket files: ${error}`);
    }

    for (const compressedObjectName of possibleNames) {
      try {
        logger.info(`🔍 Checking: ${compressedObjectName}`);
        const [exists] = await bucket.file(compressedObjectName).exists();
        if (exists) {
          // Check if this is actually the original file (not a compressed version)
          if (compressedObjectName === videoObjectName) {
            logger.info(`⚠️ Found original file, not compressed version: ${compressedObjectName}`);
            continue; // Skip the original file
          }
          
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

  /**
   * Find all compressed versions of a video
   */
  static async findAllCompressedVersions(
    originalObjectName: string,
  ): Promise<string[]> {
    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    // Extract base name by removing any existing quality suffix
    const baseName = originalObjectName
      .replace(/_\d+p\.mp4$/, ".mp4") // Remove existing quality suffix like _480p.mp4
      .replace(/__\d+p__\.mp4$/, ".mp4") // Remove double underscore pattern with .mp4
      .replace(/__\d+p__/, "__") // Remove double underscore pattern without .mp4
      .replace(".mp4", ""); // Remove .mp4 extension

    logger.info(`🔍 Looking for compressed versions of: ${originalObjectName}`);
    logger.info(`🔍 Base name: ${baseName}`);

    const compressedVersions: string[] = [];

    // Check for all possible quality versions
    const qualities = ["720p", "480p", "360p"]; // Only check for qualities we actually create

    for (const quality of qualities) {
      const possibleNames = [
        `${baseName}_${quality}.mp4`, // Most common pattern: base_quality.mp4
        `${baseName}__${quality}__.mp4`, // Double underscore pattern
        originalObjectName.replace(/_\d+p\.mp4$/, `_${quality}.mp4`), // Replace existing quality
        originalObjectName.replace(/__\d+p__/, `__${quality}__`), // Replace double underscore
      ];

      for (const compressedName of possibleNames) {
        try {
          const [exists] = await bucket.file(compressedName).exists();
          if (exists && !compressedVersions.includes(compressedName)) {
            logger.info(`✅ Found compressed version: ${compressedName}`);
            compressedVersions.push(compressedName);
          }
        } catch (error) {
          logger.warn(`❌ Error checking ${compressedName}: ${error}`);
        }
      }
    }

    logger.info(
      `🔍 Found ${compressedVersions.length} compressed versions: ${compressedVersions.join(", ")}`,
    );
    return compressedVersions;
  }

  /**
   * Delete all compressed versions of a video
   */
  static async deleteAllCompressedVersions(
    originalObjectName: string,
  ): Promise<void> {
    const compressedVersions =
      await this.findAllCompressedVersions(originalObjectName);

    if (compressedVersions.length === 0) {
      logger.info(`🔍 No compressed versions found for: ${originalObjectName}`);
      return;
    }

    logger.info(
      `🗑️ Deleting ${compressedVersions.length} compressed versions of: ${originalObjectName}`,
    );

    const storage = this.getStorage();
    const bucket = storage.bucket(env.gcsBucket);

    for (const compressedName of compressedVersions) {
      try {
        await bucket.file(compressedName).delete();
        logger.info(`✅ Deleted compressed version: ${compressedName}`);
      } catch (error) {
        logger.error(`❌ Failed to delete ${compressedName}: ${error}`);
      }
    }
  }

  /**
   * Update compression status in the database
   */
  private static async updateCompressionStatus(
    bucketPath: string,
    status: "pending" | "compressing" | "completed" | "failed",
    compressedQualities?: string[]
  ): Promise<void> {
    try {
      // Find file by externalUri (which contains the bucketPath)
      const file = await FileModel.findOne({ externalUri: bucketPath });
      if (file) {
        file.compressionStatus = status;
        if (compressedQualities) {
          file.compressedQualities = compressedQualities;
        }
        await file.save();
        logger.info(`📊 Updated compression status for ${bucketPath}: ${status}`);
      } else {
        logger.warn(`⚠️ File not found for externalUri: ${bucketPath}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to update compression status for ${bucketPath}:`, error);
    }
  }
}
