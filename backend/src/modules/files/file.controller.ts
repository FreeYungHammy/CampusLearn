import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";

const upload = multer({ storage: multer.memoryStorage() });

// Range request handler for video streaming
async function handleRangeRequest(
  req: Request,
  res: Response,
  objectName: string,
  contentType: string,
  isOriginalVideo: boolean = false,
) {
  try {
    console.log(`🎥 Range request for: ${objectName}`);
    console.log(`📊 Range header: ${req.headers.range}`);

    const { gcsService } = await import("../../services/gcs.service");
    const { Storage } = await import("@google-cloud/storage");
    const { env } = await import("../../config/env");

    const storage = new Storage({
      projectId: env.gcsProjectId,
      credentials: env.gcsKeyJson ? JSON.parse(env.gcsKeyJson) : undefined,
    });

    const bucket = storage.bucket(env.gcsBucket);
    const file = bucket.file(objectName);

    // Get file metadata
    const [metadata] = await file.getMetadata();
    const fileSize = parseInt(String(metadata.size || "0"));

    // Parse range header
    const range = req.headers.range;
    if (!range) {
      res.status(400).send("Range header required");
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // MINIMAL chunk optimization - let browser handle most buffering
    // Only limit extremely large chunks to prevent memory issues
    if (end - start > 2097152) {
      // 2MB = 2 * 1024 * 1024
      console.log(`⚡ Limiting chunk size to 2MB (was ${end - start} bytes)`);
      end = start + 2097151; // 2MB - 1 byte
    }

    // For initial requests, allow larger chunks for better buffering
    if (start === 0 && end > 1048576) {
      // 1MB = 1024 * 1024
      console.log(`⚡ Initial chunk limited to 1MB (was ${end} bytes)`);
      end = 1048575; // 1MB - 1 byte
    }

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).send("Range Not Satisfiable");
      return;
    }

    const chunkSize = end - start + 1;

    // Set response headers
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600, immutable"); // 1 hour cache
    res.setHeader("ETag", `"${objectName}-${start}-${end}"`); // Unique ETag for range
    res.setHeader("Vary", "Range"); // Important for proper caching
    res.setHeader("Connection", "keep-alive"); // Keep connection alive for better streaming

    // Stream the range from GCS
    const stream = file.createReadStream({ start, end });
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!res.headersSent) {
        res.status(500).send("Stream error");
      }
    });
  } catch (error) {
    console.error("Range request error:", error);
    res.status(500).send("Internal server error");
  }
}

// List of MIME types that can be safely displayed in a browser
const VIEWABLE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "video/mp4",
];

export const FileController = {
  create: [
    upload.single("file"),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const body = { ...req.body };
        const tutor = await FileService.findTutorByUserId(req.user!.id);
        if (!tutor) {
          return res
            .status(403)
            .json({ message: "Forbidden: Only tutors can upload files." });
        }
        body.tutorId = tutor._id; // Use the actual tutor's _id

        if (req.file) {
          body.file = {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
          };
        }
        const created = await FileService.create(body);
        res.status(201).json(created);
      } catch (e) {
        next(e);
      }
    },
  ],

  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tutorId, subject, subtopic } = req.query as any;
      const filter: any = {};
      if (tutorId) filter.tutorId = tutorId;
      if (subject) filter.subject = subject;
      if (subtopic) filter.subtopic = subtopic;

      const items = await FileService.list(
        filter,
        Number(req.query.limit ?? 20),
        Number(req.query.skip ?? 0),
      );
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  getMeta: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await FileService.getMeta(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  getBinary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`🚀 DEBUG: getBinary called for file ID: ${req.params.id}`);
      console.log(`🚀 DEBUG: Request headers:`, req.headers);
      console.log(`🚀 DEBUG: Query params:`, req.query);
      
      const item = await FileService.getWithBinary(req.params.id);
      if (!item) {
        console.log(`❌ DEBUG: File not found for ID: ${req.params.id}`);
        return res.status(404).json({ message: "File not found" });
      }

      console.log(`📁 Serving file: ${item.title} (${item.contentType})`);
      console.log(`🔗 External URI: ${(item as any).externalUri}`);
      console.log(`📊 Range header: ${req.headers.range}`);
      console.log(`🎯 Quality param: ${req.query.quality}`);

      // If file is stored in GCS, redirect directly to signed URL
      if ((item as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const { VideoCompressionService } = await import(
          "../../services/video-compression.service"
        );

        const objectName = String((item as any).externalUri).replace(
          /^gs:\/\//,
          "",
        );

        // Handle quality parameter for video files
        if (item.contentType.startsWith("video/") && req.query.quality) {
          const requestedQuality = String(req.query.quality);
          console.log(`🎯 Quality requested: ${requestedQuality}`);
          console.log(`📁 Original object name: ${objectName}`);

          try {
            // Try to get the compressed version with the requested quality
            const compressedUrl =
              await VideoCompressionService.getBestQualityUrl(
                objectName,
                undefined, // No connection speed preference
                requestedQuality, // Use the requested quality
              );

            console.log(`🔍 Compressed URL returned: ${compressedUrl}`);
            console.log(`🔍 Original object name: ${objectName}`);
            console.log(
              `🔍 Are they different? ${compressedUrl !== objectName}`,
            );

            // If we found a compressed version, use it
            if (compressedUrl && compressedUrl !== objectName) {
              console.log(`✅ Using compressed version: ${compressedUrl}`);
              console.log(`🔗 Generating signed URL for compressed version...`);
              try {
                console.log(`🔗 DEBUG: Generating signed URL for: ${compressedUrl}`);
                const signedUrl =
                  await gcsService.getSignedReadUrl(compressedUrl);
                console.log(
                  `🔗 Generated signed URL: ${signedUrl.substring(0, 100)}...`,
                );
                console.log(`🔗 DEBUG: Full signed URL: ${signedUrl}`);
                console.log(`🔗 DEBUG: Redirecting to signed URL`);
                return res.redirect(signedUrl);
              } catch (error) {
                console.error(
                  `❌ Failed to generate signed URL for compressed version:`,
                  error,
                );
                console.error(`❌ DEBUG: Error details:`, error);
                return res.status(500).json({
                  message: "Failed to generate video URL",
                });
              }
            } else {
              console.log(
                `⚠️ No compressed version found for ${requestedQuality}`,
              );
              console.log(
                `⚠️ This means the compressed file doesn't exist in GCS`,
              );
              console.log(`⚠️ Returning 404 since original was likely deleted`);
              return res.status(404).json({
                message: `Video quality ${requestedQuality} not available. Original video may have been compressed and deleted.`,
              });
            }
          } catch (error) {
            console.warn(`⚠️ Failed to get compressed version:`, error);
            console.log(`⚠️ Returning 404 due to compression service error`);
            return res.status(404).json({
              message: "Video quality not available due to processing error.",
            });
          }
        }

        // For videos without quality parameter, try to serve a default quality
        if (item.contentType.startsWith("video/")) {
          console.log(
            `🎥 Video without quality parameter, trying default 480p`,
          );
          try {
            const defaultQualityUrl =
              await VideoCompressionService.getBestQualityUrl(
                objectName,
                undefined,
                "480p", // Default to 480p
              );

            if (defaultQualityUrl && defaultQualityUrl !== objectName) {
              console.log(
                `✅ Using default compressed version: ${defaultQualityUrl}`,
              );
              console.log(
                `🔗 Generating signed URL for default compressed version...`,
              );
              try {
                console.log(`🔗 DEBUG: Generating signed URL for default: ${defaultQualityUrl}`);
                const signedUrl =
                  await gcsService.getSignedReadUrl(defaultQualityUrl);
                console.log(
                  `🔗 Generated signed URL: ${signedUrl.substring(0, 100)}...`,
                );
                console.log(`🔗 DEBUG: Full signed URL: ${signedUrl}`);
                console.log(`🔗 DEBUG: Redirecting to signed URL`);
                return res.redirect(signedUrl);
              } catch (error) {
                console.error(
                  `❌ Failed to generate signed URL for default compressed version:`,
                  error,
                );
                console.error(`❌ DEBUG: Error details:`, error);
                return res.status(500).json({
                  message: "Failed to generate video URL",
                });
              }
            } else {
              console.log(`⚠️ No compressed versions available, returning 404`);
              return res.status(404).json({
                message:
                  "Video not available. Original may have been compressed and deleted.",
              });
            }
          } catch (error) {
            console.warn(`⚠️ Failed to get default compressed version:`, error);
            return res.status(404).json({
              message: "Video not available due to processing error.",
            });
          }
        }

        console.log(`🎥 Redirecting non-video file directly to GCS`);
        const url = await gcsService.getSignedReadUrl(objectName);
        return res.redirect(url);
      }

      // For non-GCS files, serve directly
      const extension = mime.extension(item.contentType);
      const filename = `${item.title ?? "file"}.${extension || "bin"}`;

      const isViewable = VIEWABLE_MIME_TYPES.some((type) =>
        item.contentType.startsWith(type),
      );
      const forceDownload = req.query.download === "true";
      const disposition =
        isViewable && !forceDownload ? "inline" : "attachment";

      res.setHeader("Content-Type", item.contentType);
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${filename}"`,
      );
      res.send((item as any).content);
    } catch (e) {
      next(e);
    }
  },

  getThumbnail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await FileService.getMeta(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });

      // Only generate thumbnails for videos
      if (!item.contentType.startsWith("video/")) {
        return res
          .status(400)
          .json({ message: "Thumbnails only available for videos" });
      }

      // If file is stored in GCS, generate thumbnail
      if ((item as any).externalUri) {
        const { ThumbnailService } = await import(
          "../../services/thumbnail.service"
        );
        const objectName = String((item as any).externalUri).replace(
          /^gs:\/\//,
          "",
        );
        const thumbnailUrl = await ThumbnailService.getThumbnailUrl(objectName);

        // If it's a data URL, return it directly
        if (thumbnailUrl.startsWith("data:")) {
          const base64Data = thumbnailUrl.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          res.setHeader("Content-Type", "image/svg+xml");
          res.setHeader("Cache-Control", "public, max-age=3600");
          return res.send(buffer);
        }

        // Otherwise redirect to the thumbnail URL
        return res.redirect(thumbnailUrl);
      }

      // For non-GCS files, return a default thumbnail
      const { ThumbnailService } = await import(
        "../../services/thumbnail.service"
      );
      const defaultThumbnail =
        ThumbnailService.getDefaultVideoThumbnailStatic();
      const base64Data = defaultThumbnail.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(buffer);
    } catch (e) {
      next(e);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = { ...req.body };
      if (req.file) {
        body.file = {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        };
      }
      const updated = await FileService.update(req.params.id, body);
      if (!updated) return res.status(404).json({ message: "File not found" });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  byTutor: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutor(req.params.tutorId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  byUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutorUserId(req.params.userId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  myContent: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const items = await FileService.byTutorUserId(userId);
      res.json(items);
    } catch (e) {
      next(e);
    }
  },

  getSignedUrlForVideo: async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { filename } = req.params;
      const url = await FileService.getSignedUrlForVideo(filename);
      res.json({ url });
    } catch (e) {
      next(e);
    }
  },

  remove: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.id;
      const userId = req.user!.id;

      const file = await FileService.getMeta(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const isOwner = await FileService.isOwner(
        userId,
        file.tutorId.toString(),
      );

      if (!isOwner) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // If GCS-backed, remove object first (best-effort)
      if ((file as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const objectName = String((file as any).externalUri).replace(
          /^gs:\/\//,
          "",
        );
        try {
          await gcsService.deleteObject(objectName);
        } catch {}
      }

      const deleted = await FileService.remove(fileId);
      if (!deleted) return res.status(404).json({ message: "File not found" });

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
};
