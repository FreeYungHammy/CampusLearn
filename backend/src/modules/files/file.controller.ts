import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";
import fetch from "node-fetch";
import { createLogger } from "../../config/logger";

const upload = multer({ storage: multer.memoryStorage() });
const logger = createLogger("FileController");

/**
 * Verifies if the authenticated user has access to the requested file
 * @param userId Authenticated user ID
 * @param fileId File ID to check access for
 * @returns Promise<boolean> true if user has access
 */
async function verifyFileAccess(userId: string, fileId: string): Promise<boolean> {
  try {
    const file = await FileService.getMeta(fileId);
    if (!file) {
      logger.warn(`File not found: ${fileId}`);
      return false;
    }

    // Check if user is the owner of the file
    const isOwner = await FileService.isOwner(userId, file.tutorId.toString());
    if (isOwner) {
      logger.info(`User ${userId} has owner access to file ${fileId}`);
      return true;
    }

    // For now, allow all authenticated users to access files
    // In the future, you might want to implement more granular permissions
    logger.info(`User ${userId} has general access to file ${fileId}`);
    return true;
  } catch (error) {
    logger.error(`Error verifying file access for user ${userId}, file ${fileId}:`, error);
    return false;
  }
}

// Range request handler for video streaming
async function handleRangeRequest(
  req: Request,
  res: Response,
  objectName: string,
  contentType: string,
  isOriginalVideo: boolean = false,
) {
  try {
    const { gcsService } = await import("../../services/gcs.service");
    
    // Use the existing authenticated GCS service instead of creating a new instance
    const bucket = gcsService.getBucket();
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

    // Limit chunk size to prevent memory issues
    if (end - start > 2097152) { // 2MB
      end = start + 2097151;
    }

    // For initial requests, allow larger chunks for better buffering
    if (start === 0 && end > 1048576) { // 1MB
      end = 1048575;
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
    res.setHeader("Cache-Control", "public, max-age=3600, immutable");
    res.setHeader("ETag", `"${objectName}-${start}-${end}"`);
    res.setHeader("Vary", "Range");
    res.setHeader("Connection", "keep-alive");

    // Stream the range from GCS
    const stream = file.createReadStream({ start, end });
    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Video stream error:", error.message);
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

  getMeta: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      // Verify user has access to this file
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const hasAccess = await verifyFileAccess(req.user.id, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const item = await FileService.getMeta(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });
      res.json(item);
    } catch (e) {
      next(e);
    }
  },

  getBinary: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      console.log(`🎬 [getBinary] Request for file ${req.params.id}, quality: ${req.query.quality}, token: ${req.query.token ? 'present' : 'missing'}`);
      
      // Handle authentication via token in query parameter (for video elements)
      let userId = req.user?.id;
      
      if (!userId && req.query.token) {
        try {
          const { verifyJwt } = await import("../../auth/jwt");
          const decoded = verifyJwt(req.query.token as string);
          if (decoded) {
            userId = decoded.id;
          }
        } catch (tokenError) {
          console.warn("Invalid token in query parameter:", tokenError);
        }
      }
      
      // Verify user has access to this file
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const hasAccess = await verifyFileAccess(userId, req.params.id);
      if (!hasAccess) {
        console.log(`🚫 [getBinary] Access denied for user ${userId} to file ${req.params.id}`);
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`✅ [getBinary] Access granted for user ${userId} to file ${req.params.id}`);

      // Set CORS headers for video requests
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      
      const item = await FileService.getWithBinary(req.params.id);
      if (!item) {
        console.log(`❌ [getBinary] File not found: ${req.params.id}`);
        return res.status(404).json({ message: "File not found" });
      }

      console.log(`📁 [getBinary] File found: ${item.title}, contentType: ${item.contentType}, externalUri: ${(item as any).externalUri ? 'present' : 'missing'}`);

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
                console.log(`🔗 DEBUG: Proxying video content instead of redirecting`);
                // Instead of redirecting, proxy the video content to avoid CORS issues
                try {
                  // Prepare headers for the fetch request
                  const fetchHeaders: any = {};
                  if (req.headers.range) {
                    fetchHeaders['Range'] = req.headers.range;
                  }
                  
                  console.log(`🔗 Fetching signed URL with headers:`, fetchHeaders);
                  const response = await fetch(signedUrl, { headers: fetchHeaders });
                  
                  if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                  }
                  
                  console.log(`🔗 Response status: ${response.status}`);
                  console.log(`🔗 Response headers:`, Object.fromEntries(response.headers.entries()));
                  
                  // Set appropriate headers for video streaming
                  const responseHeaders: any = {
                    'Content-Type': response.headers.get('content-type') || item.contentType,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': req.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
                  };
                  
                  // Copy content-length and content-range from the response
                  const contentLength = response.headers.get('content-length');
                  if (contentLength) {
                    responseHeaders['Content-Length'] = contentLength;
                  }
                  
                  const contentRange = response.headers.get('content-range');
                  if (contentRange) {
                    responseHeaders['Content-Range'] = contentRange;
                  }
                  
                  // Set status code
                  if (response.status === 206) {
                    res.status(206);
                  } else {
                    res.status(200);
                  }
                  
                  res.set(responseHeaders);
                  
                  console.log(`🔗 Streaming video content...`);
                  
                  // Stream the video content
                  if (response.body) {
                    console.log(`🔗 Starting to pipe video content to response...`);
                    response.body.pipe(res);
                    
                    // Add error handling for the stream
                    response.body.on('error', (streamError) => {
                      console.error(`❌ Stream error:`, streamError);
                    });
                    
                    response.body.on('end', () => {
                      console.log(`✅ Video streaming completed`);
                    });
                    
                    res.on('close', () => {
                      console.log(`🔗 Client disconnected during streaming`);
                    });
                  } else {
                    throw new Error('No response body available');
                  }
                  return;
                } catch (proxyError) {
                  console.error(`❌ Failed to proxy video content:`, proxyError);
                  return res.status(500).json({
                    message: "Failed to stream video content",
                    error: String(proxyError)
                  });
                }
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

            if (defaultQualityUrl) {
              console.log(
                `✅ Using video version: ${defaultQualityUrl}`,
              );
              console.log(
                `🔗 Generating signed URL for video...`,
              );
              try {
                console.log(`🔗 DEBUG: Generating signed URL for: ${defaultQualityUrl}`);
                const signedUrl =
                  await gcsService.getSignedReadUrl(defaultQualityUrl);
                console.log(
                  `🔗 Generated signed URL: ${signedUrl.substring(0, 100)}...`,
                );
                console.log(`🔗 DEBUG: Full signed URL: ${signedUrl}`);
                console.log(`🔗 DEBUG: Redirecting to signed URL`);
                console.log(`🔗 DEBUG: Proxying video content instead of redirecting`);
                // Instead of redirecting, proxy the video content to avoid CORS issues
                try {
                  // Prepare headers for the fetch request
                  const fetchHeaders: any = {};
                  if (req.headers.range) {
                    fetchHeaders['Range'] = req.headers.range;
                  }
                  
                  console.log(`🔗 Fetching signed URL with headers:`, fetchHeaders);
                  const response = await fetch(signedUrl, { headers: fetchHeaders });
                  
                  if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                  }
                  
                  console.log(`🔗 Response status: ${response.status}`);
                  console.log(`🔗 Response headers:`, Object.fromEntries(response.headers.entries()));
                  
                  // Set appropriate headers for video streaming
                  const responseHeaders: any = {
                    'Content-Type': response.headers.get('content-type') || item.contentType,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': req.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
                  };
                  
                  // Copy content-length and content-range from the response
                  const contentLength = response.headers.get('content-length');
                  if (contentLength) {
                    responseHeaders['Content-Length'] = contentLength;
                  }
                  
                  const contentRange = response.headers.get('content-range');
                  if (contentRange) {
                    responseHeaders['Content-Range'] = contentRange;
                  }
                  
                  // Set status code
                  if (response.status === 206) {
                    res.status(206);
                  } else {
                    res.status(200);
                  }
                  
                  res.set(responseHeaders);
                  
                  console.log(`🔗 Streaming video content...`);
                  
                  // Stream the video content
                  if (response.body) {
                    console.log(`🔗 Starting to pipe video content to response...`);
                    response.body.pipe(res);
                    
                    // Add error handling for the stream
                    response.body.on('error', (streamError) => {
                      console.error(`❌ Stream error:`, streamError);
                    });
                    
                    response.body.on('end', () => {
                      console.log(`✅ Video streaming completed`);
                    });
                    
                    res.on('close', () => {
                      console.log(`🔗 Client disconnected during streaming`);
                    });
                  } else {
                    throw new Error('No response body available');
                  }
                  return;
                } catch (proxyError) {
                  console.error(`❌ Failed to proxy video content:`, proxyError);
                  return res.status(500).json({
                    message: "Failed to stream video content",
                    error: String(proxyError)
                  });
                }
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
              console.log(`⚠️ No video URL available`);
              return res.status(404).json({
                message: "Video not available.",
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
