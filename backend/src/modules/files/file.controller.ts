import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";

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
      return true;
    }

    // For now, allow all authenticated users to access files
    // In the future, you might want to implement more granular permissions
    return true;
  } catch (error) {
    logger.error(`Error verifying file access for user ${userId}, file ${fileId}:`, error);
    return false;
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
  validateCompression: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const item = await FileService.getWithBinary(id);
      
      if (!item) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Only validate compression for video files
      if (!item.contentType.startsWith("video/")) {
        return res.status(400).json({ 
          message: "Compression validation only applies to video files",
          fileType: item.contentType
        });
      }
      
      const gcsService = (await import("../../services/gcs.service")).gcsService;
      const { VideoCompressionService } = await import("../../services/video-compression.service");
      
      const itemAny = item as any; // Type cast to access optional fields
      
      if (!item.externalUri) {
        return res.json({
          message: "File is not stored in GCS",
          compressionStatus: itemAny.compressionStatus,
          availableQualities: itemAny.compressedQualities || [],
          actualFilesExist: false
        });
      }
      
      // Check if original file exists
      const originalExists = await gcsService.objectExists(item.externalUri);
      
      // Check which compressed qualities actually exist
      const availableQualities = itemAny.compressedQualities || [];
      const existingQualities: string[] = [];
      
      for (const quality of availableQualities) {
        try {
          const compressedName = await VideoCompressionService.getBestQualityUrl(
            item.externalUri, 
            "medium", 
            quality
          );
          
          // If getBestQualityUrl returns a different name, it means the compressed version exists
          if (compressedName !== item.externalUri && compressedName.includes(quality)) {
            const exists = await gcsService.objectExists(compressedName);
            if (exists) {
              existingQualities.push(quality);
            }
          }
        } catch (error) {
          console.warn(`Failed to check quality ${quality}:`, error);
        }
      }
      
      // Determine actual compression status
      let actualStatus = itemAny.compressionStatus;
      if (itemAny.compressionStatus === "completed" && existingQualities.length === 0) {
        actualStatus = "failed";
      } else if (itemAny.compressionStatus === "completed" && existingQualities.length < availableQualities.length) {
        actualStatus = "failed"; // Use "failed" instead of "partial" since it's not in the enum
      }
      
      return res.json({
        message: "Compression validation completed",
        originalFileExists: originalExists,
        compressionStatus: itemAny.compressionStatus,
        actualCompressionStatus: actualStatus,
        availableQualities: itemAny.compressedQualities || [],
        existingQualities,
        missingQualities: availableQualities.filter((q: string) => !existingQualities.includes(q))
      });
      
    } catch (error) {
      console.error("Compression validation failed:", error);
      next(error);
    }
  },

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
        return res.status(201).json(created);
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
      return res.json(items);
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
      return res.json(item);
    } catch (e) {
      next(e);
    }
  },

  getBinary: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
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
        return res.status(403).json({ message: "Access denied" });
      }

      // Set CORS headers for video requests
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      
      const item = await FileService.getWithBinary(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "File not found" });
      }

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

          // If compression is in progress and no compressed version available yet, return 202
          if ((item as any).compressionStatus === "compressing") {
            console.log(`🎬 Compression in progress for quality ${requestedQuality}, checking if compressed version exists`);
            try {
              const compressedUrl = await VideoCompressionService.getBestQualityUrl(
                objectName,
                undefined,
                requestedQuality,
              );
              
              if (compressedUrl && compressedUrl !== objectName) {
                console.log(`✅ Found compressed version during compression: ${compressedUrl}`);
                // Continue with normal compressed version serving - fall through to quality handling
              } else {
                console.log(`⚠️ No compressed version available yet for ${requestedQuality}, compression still in progress`);
                if (req.method === 'HEAD') {
                  // For HEAD requests, return 202 with appropriate headers
                  res.set({
                    'Content-Type': 'text/plain',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': req.headers.origin || '*',
                    'Access-Control-Allow-Credentials': 'true'
                  });
                  return res.status(202).end();
                } else {
                  return res.status(202).json({
                    message: "Video is being processed. Please wait a moment and try again.",
                    compressionStatus: "compressing"
                  });
                }
              }
            } catch (error) {
              console.error(`❌ Failed to check compressed version during compression:`, error);
              if (req.method === 'HEAD') {
                // For HEAD requests, return 202 with appropriate headers
                res.set({
                  'Content-Type': 'text/plain',
                  'Cache-Control': 'no-cache',
                  'Access-Control-Allow-Origin': req.headers.origin || '*',
                  'Access-Control-Allow-Credentials': 'true'
                });
                return res.status(202).end();
              } else {
                return res.status(202).json({
                  message: "Video is being processed. Please wait a moment and try again.",
                  compressionStatus: "compressing"
                });
              }
            }
          }

          try {
            // Try to get the compressed version with the requested quality
            const compressedUrl =
              await VideoCompressionService.getBestQualityUrl(
                objectName,
                undefined, // No connection speed preference
                requestedQuality // Use the requested quality
              );

            // If we found a compressed version, use it
            if (compressedUrl && compressedUrl !== objectName) {
              try {
                const signedUrl =
                  await gcsService.getSignedReadUrl(compressedUrl);
                
                return res.redirect(signedUrl);
              } catch (error) {
                console.error(
                  `❌ Failed to generate signed URL for compressed version, falling back to original:`,
                  error,
                );
                // Fallback to original video
                try {
                  const originalSignedUrl = await gcsService.getSignedReadUrl(objectName);
                  return res.redirect(originalSignedUrl);
                } catch (fallbackError) {
                  console.error(`❌ Failed to generate signed URL for original video:`, fallbackError);
                  return res.status(404).json({
                    message: `Video not available.`,
                    availableQualities: (item as any).compressedQualities || [],
                    compressionStatus: (item as any).compressionStatus,
                  });
                }
              }
            } else {
              // No compressed version found, fallback to original
              console.log(`🔄 No compressed version found for ${requestedQuality}, serving original`);
              try {
                const originalSignedUrl = await gcsService.getSignedReadUrl(objectName);
                return res.redirect(originalSignedUrl);
              } catch (fallbackError) {
                console.error(`❌ Failed to generate signed URL for original video:`, fallbackError);
                return res.status(404).json({
                  message: `Video not available.`,
                  availableQualities: (item as any).compressedQualities || [],
                  compressionStatus: (item as any).compressionStatus,
                });
              }
            }
          } catch (error) {
            return res.status(404).json({
              message: "Video quality not available due to processing error.",
              availableQualities: (item as any).compressedQualities || [],
              compressionStatus: (item as any).compressionStatus,
              fallbackToOriginal: true
            });
          }
        }

        // For videos without quality parameter, try to serve a default quality
        if (item.contentType.startsWith("video/") && !req.query.quality) {
          // If compression is in progress, serve the original video directly
          if ((item as any).compressionStatus === "compressing") {
            try {
              const signedUrl = await gcsService.getSignedReadUrl(objectName);
              
              // Proxy the video content to avoid CORS issues with signed URLs
              try {
                const fetch = (await import("node-fetch")).default;
                const fetchHeaders: any = {};
                if (req.headers.range) {
                  fetchHeaders['Range'] = req.headers.range;
                }
                
                const response = await fetch(signedUrl, { headers: fetchHeaders });
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }
                
                // Set appropriate headers for video streaming
                const responseHeaders: any = {
                  'Content-Type': response.headers.get('content-type') || item.contentType,
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*',
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
                
                // Set all headers
                Object.keys(responseHeaders).forEach(key => {
                  res.setHeader(key, responseHeaders[key]);
                });
                
                // Stream the video content
                if (response.body) {
                  response.body.pipe(res);
                  return; // Exit after streaming
                } else {
                  return res.status(500).json({ message: 'Failed to stream video content' });
                }
              } catch (proxyError) {
                console.error('❌ Failed to proxy video content:', proxyError);
                return res.status(500).json({ message: 'Failed to stream video' });
              }
            } catch (error) {
              console.error(`❌ Failed to generate signed URL for original during compression:`, error);
              return res.status(500).json({
                message: "Failed to access video during compression",
                error: String(error)
              });
            }
          }
          
          // If compression failed, serve original video directly
          if ((item as any).compressionStatus === "failed") {
            console.log(`🎬 Compression failed, serving original video: ${objectName}`);
            try {
              const signedUrl = await gcsService.getSignedReadUrl(objectName);
              console.log(`🔗 Generated signed URL for original: ${signedUrl.substring(0, 100)}...`);
              
              // Proxy the video content to avoid CORS issues with signed URLs
              try {
                const fetch = (await import("node-fetch")).default;
                const fetchHeaders: any = {};
                if (req.headers.range) {
                  fetchHeaders['Range'] = req.headers.range;
                }
                
                const response = await fetch(signedUrl, { headers: fetchHeaders });
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }
                
                // Set appropriate headers for video streaming
                const responseHeaders: any = {
                  'Content-Type': response.headers.get('content-type') || item.contentType,
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*',
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
                
                // Set all headers
                Object.keys(responseHeaders).forEach(key => {
                  res.setHeader(key, responseHeaders[key]);
                });
                
                // Stream the video content
                if (response.body) {
                  response.body.pipe(res);
                  return; // Exit after streaming
                } else {
                  return res.status(500).json({ message: 'Failed to stream video content' });
                }
              } catch (proxyError) {
                console.error('❌ Failed to proxy video content:', proxyError);
                return res.status(500).json({ message: 'Failed to stream video' });
              }
            } catch (error) {
              console.error(`❌ Failed to generate signed URL for original:`, error);
              return res.status(500).json({
                message: "Failed to generate video URL",
              });
            }
          }
          
          // If compression is completed or not started, try to find compressed versions
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
                const signedUrl =
                  await gcsService.getSignedReadUrl(defaultQualityUrl);
                console.log(
                  `🔗 Generated signed URL: ${signedUrl.substring(0, 100)}...`,
                );
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
      return res.send((item as any).content);
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
      return res.send(buffer);
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
      return res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  byTutor: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutor(req.params.tutorId);
      return res.json(items);
    } catch (e) {
      next(e);
    }
  },

  byUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await FileService.byTutorUserId(req.params.userId);
      return res.json(items);
    } catch (e) {
      next(e);
    }
  },

  myContent: async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const items = await FileService.byTutorUserId(userId);
      return res.json(items);
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
      return res.json({ url });
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

      return res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  // Get compression status for a video file
  getCompressionStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.id;
      
      if (!fileId) {
        return res.status(400).json({ message: "File ID is required" });
      }

      const file = await FileService.getWithBinary(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check if it's a video file
      if (!file.contentType.startsWith("video/")) {
        return res.status(400).json({ 
          message: "Compression status only applies to video files" 
        });
      }

      // Return compression status and available qualities
      return res.json({
        compressionStatus: (file as any).compressionStatus || "pending",
        compressedQualities: (file as any).compressedQualities || [],
        fileId: fileId
      });
    } catch (e) {
      next(e);
    }
  },

  // Start compression when video is played
    startCompression: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const fileId = req.params.id;
        console.log(`🎬 [startCompression] Received request for fileId: ${fileId}`);
        console.log(`🔍 [startCompression] fileId type: ${typeof fileId}`);
        console.log(`🔍 [startCompression] fileId length: ${fileId ? fileId.length : 'undefined'}`);
        console.log(`🔍 [startCompression] Full fileId: ${fileId}`);
        console.log(`🔍 [startCompression] All params:`, req.params);
        console.log(`🔍 [startCompression] Request URL:`, req.url);
        console.log(`🔍 [startCompression] Request method:`, req.method);
        console.log(`🔍 [startCompression] Request path:`, req.path);
        
        if (!fileId) {
          console.log(`❌ [startCompression] fileId is undefined or empty`);
          return res.status(400).json({ message: "File ID is required" });
        }
        
        const file = await FileService.getWithBinary(fileId);
        
        if (!file) {
          console.log(`❌ [startCompression] File not found for fileId: ${fileId}`);
          return res.status(404).json({ message: "File not found" });
        }

        console.log(`✅ [startCompression] File found: ${(file as any).title}`);
        console.log(`🔍 [startCompression] Compression status: ${(file as any).compressionStatus}`);

        // Check if compression is already started or completed
        if ((file as any).compressionStatus === "compressing" || (file as any).compressionStatus === "completed") {
          console.log(`⚠️ [startCompression] Compression already ${(file as any).compressionStatus}`);
          return res.status(200).json({ 
            message: "Compression already in progress or completed",
            status: (file as any).compressionStatus 
          });
        }

        // Only start compression if status is "pending"
        if ((file as any).compressionStatus !== "pending") {
          console.log(`❌ [startCompression] Cannot start compression, status: ${(file as any).compressionStatus}`);
          return res.status(400).json({ 
            message: "Compression cannot be started for this file",
            status: (file as any).compressionStatus 
          });
        }

      // Check if it's a video file
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m'];
      const hasVideoExtension = videoExtensions.some(ext => 
        String((file as any).externalUri).toLowerCase().includes(ext)
      );
      
      if (!(file as any).externalUri || !hasVideoExtension) {
        console.log(`❌ [startCompression] Not a video file - externalUri: ${(file as any).externalUri}`);
        console.log(`❌ [startCompression] Content type: ${(file as any).contentType}`);
        return res.status(400).json({ message: "Not a video file" });
      }

      const objectName = String((file as any).externalUri).replace(/^gs:\/\//, "");
      
      // Extract base name more robustly (including .m files)
      const baseName = objectName.replace(/\.(mp4|webm|ogg|avi|mov|mkv|m)$/i, "");
      
      // Start compression in background
      const { VideoCompressionService } = await import("../../services/video-compression.service");
      
      // Update status to compressing
      await FileService.update(fileId, { compressionStatus: "compressing" });
      
      // Start compression with better logging
      console.log(`🚀 Starting compression for: ${objectName}`);
      console.log(`📁 Base name: ${baseName}`);
      console.log(`🎯 Qualities to compress: 360p, 480p, 720p`);
      
      const compressionPromise = VideoCompressionService.compressVideo(
        objectName,
        baseName,
        ["360p", "480p", "720p"]
      );

      // Handle compression completion
      compressionPromise
        .then(async (result) => {
          console.log(`✅ Compression completed for: ${objectName}`);
          console.log(`📊 Compression result:`, result);
          
          // Check if compressed versions exist and are working
          try {
            const compressedVersions = await VideoCompressionService.findAllCompressedVersions(objectName);
            console.log(`🔍 Found ${compressedVersions.length} compressed versions:`, compressedVersions);
            
            const EXPECTED_QUALITIES = 3; // 360p, 480p, 720p
            
            if (compressedVersions.length >= EXPECTED_QUALITIES) { // All 3 qualities available
              console.log(`✅ All compressed versions available, deleting original: ${objectName}`);
              
              // Delete original video
              const { gcsService } = await import("../../services/gcs.service");
              await gcsService.deleteObject(objectName);
              
              // Update status to completed with compressed qualities
              await FileService.update(fileId, { 
                compressionStatus: "completed",
                compressedQualities: ["360p", "480p", "720p"]
              });
              
              console.log(`🗑️ Deleted original video: ${objectName}`);
            } else {
              console.log(`⚠️ Not all compressed versions available (${compressedVersions.length}/${EXPECTED_QUALITIES}), keeping original: ${objectName}`);
              await FileService.update(fileId, { 
                compressionStatus: "completed",
                compressedQualities: compressedVersions.map(v => v.split('_').pop()?.replace('.mp4', '')).filter((q): q is string => Boolean(q))
              });
            }
          } catch (error) {
            console.error(`❌ Error checking compressed versions:`, error);
            await FileService.update(fileId, { compressionStatus: "completed" });
          }
        })
        .catch(async (error) => {
          console.error(`❌ Compression failed for ${objectName}:`, error);
          console.error(`❌ Error details:`, error.message);
          console.error(`❌ Error stack:`, error.stack);
          // Update status to failed but keep original
          await FileService.update(fileId, { compressionStatus: "failed" });
        });

      return res.status(202).json({ 
        message: "Compression started",
        status: "compressing"
      });
      
    } catch (e) {
      next(e);
    }
  },
};
