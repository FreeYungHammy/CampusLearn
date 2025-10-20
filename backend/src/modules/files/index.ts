import { Router } from "express";
import { FileController } from "./file.controller";
import { FileService } from "./file.service";
import { requireAuth, requireTutor } from "../../auth/auth.middleware";

const r = Router();
r.post("/", requireAuth, requireTutor, FileController.create);
r.get("/", FileController.list);

// Secure endpoint: current tutor's content (meta only, excludes binary)
r.get("/my-content", requireAuth, requireTutor, FileController.myContent);

// Secure endpoint: get a signed URL for a video file
r.get(
  "/videos/:filename/url",
  requireAuth,
  FileController.getSignedUrlForVideo,
);

// CDN management endpoints
r.get("/cdn/stats", requireAuth, requireTutor, async (req, res) => {
  try {
    const { CDNService } = await import("../../services/cdn.service");
    const cdnService = CDNService.getInstance();
    const stats = await cdnService.getCDNStats();
    res.json(stats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get CDN stats", error: String(error) });
  }
});

r.post("/cdn/preload/:id", requireAuth, requireTutor, async (req, res) => {
  try {
    const { CDNService } = await import("../../services/cdn.service");
    const item = await FileService.getWithBinary(req.params.id);

    if (!item || !(item as any).externalUri) {
      return res.status(404).json({ message: "Video not found" });
    }

    const objectName = String((item as any).externalUri).replace(
      /^gs:\/\//,
      "",
    );
    const cdnService = CDNService.getInstance();

    await cdnService.preloadVideo(objectName, ["1080p", "720p", "480p"]);

    res.json({ message: "Video preloaded to CDN", objectName });
  } catch (error) {
    res
      .status(500)
      .json({ message: "CDN preload failed", error: String(error) });
  }
});

r.post("/cdn/invalidate/:id", requireAuth, requireTutor, async (req, res) => {
  try {
    const { CDNService } = await import("../../services/cdn.service");
    const item = await FileService.getWithBinary(req.params.id);

    if (!item || !(item as any).externalUri) {
      return res.status(404).json({ message: "Video not found" });
    }

    const objectName = String((item as any).externalUri).replace(
      /^gs:\/\//,
      "",
    );
    const cdnService = CDNService.getInstance();

    const success = await cdnService.invalidateCache(objectName);

    res.json({
      message: success
        ? "CDN cache invalidated"
        : "CDN cache invalidation failed",
      objectName,
      success,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "CDN invalidation failed", error: String(error) });
  }
});

// Test endpoint for video compression
r.post("/test-compression/:id", requireAuth, requireTutor, async (req, res) => {
  try {
    const { VideoCompressionService } = await import(
      "../../services/video-compression.service"
    );
    const item = await FileService.getWithBinary(req.params.id);

    if (!item || !(item as any).externalUri) {
      return res.status(404).json({ message: "Video not found" });
    }

    const objectName = String((item as any).externalUri).replace(
      /^gs:\/\//,
      "",
    );
    const outputPrefix = `compressed_${Date.now()}`;

    console.log(`🎬 Starting compression for: ${objectName}`);
    const compressedVersions = await VideoCompressionService.compressVideo(
      objectName,
      outputPrefix,
    );

    res.json({
      message: "Compression completed",
      original: objectName,
      compressed: compressedVersions,
    });
  } catch (error) {
    console.error("Compression test failed:", error);
    res.status(500).json({
      message: "Compression failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Public convenience: list content by tutor's user id (no auth, for functionality-first phase)
r.get("/by-user/:userId", FileController.byUser);

r.get("/by-tutor/:tutorId", FileController.byTutor);
r.get("/:id/binary", FileController.getBinary);
r.get("/:id/thumbnail", FileController.getThumbnail);
r.get("/:id", requireAuth, FileController.getMeta);
r.patch("/:id", requireAuth, requireTutor, FileController.update);
r.delete("/:id", requireAuth, requireTutor, FileController.remove);

// Manual compression endpoint for existing videos
r.post("/compress/:id", requireAuth, requireTutor, async (req, res) => {
  try {
    const item = await FileService.getWithBinary(req.params.id);

    if (!item || !(item as any).externalUri) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (!item.contentType.startsWith("video/")) {
      return res.status(400).json({ message: "File is not a video" });
    }

    const objectName = String((item as any).externalUri).replace(
      /^gs:\/\//,
      "",
    );

    // Start compression
    const { VideoCompressionService } = await import(
      "../../services/video-compression.service"
    );
    const compressionPromise = VideoCompressionService.compressVideo(
      objectName,
      objectName.replace(".mp4", ""),
      ["360p", "480p", "720p"],
    );

    // Don't await - let it run in background
    compressionPromise
      .then(async () => {
        console.log(`✅ Manual compression completed for: ${objectName}`);

        // Delete original video after successful compression
        try {
          const { gcsService } = await import("../../services/gcs.service");
          await gcsService.deleteObject(objectName);
          console.log(`🗑️ Deleted original video: ${objectName}`);
        } catch (error) {
          console.warn(
            `⚠️ Failed to delete original video ${objectName}:`,
            error,
          );
        }
      })
      .catch((error) => {
        console.error(`❌ Manual compression failed for ${objectName}:`, error);
      });

    res.json({
      message: "Compression started in background",
      objectName,
      note: "Original video will be deleted after compression completes",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Compression failed", error: String(error) });
  }
});

export default r;
