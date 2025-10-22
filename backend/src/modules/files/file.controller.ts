import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";
import fetch from "node-fetch";
import { createLogger } from "../../config/logger";

const upload = multer({ storage: multer.memoryStorage() });
const logger = createLogger("FileController");

// Helper function to stream video content with no timeout limits for hosted environment
async function streamVideoContent(fetchResponse: any, expressRes: any): Promise<void> {
  if (!fetchResponse.body) {
    throw new Error('No response body available');
  }

  // Pipe video content to client
  
  // Use the simple pipe method with no timeout limits
  fetchResponse.body.pipe(expressRes);
  
  // Add error handling for the stream
  fetchResponse.body.on('error', (streamError: Error) => {
    console.error(`❌ Stream error:`, streamError);
    if (!expressRes.headersSent) {
      expressRes.status(500).json({ message: "Stream error" });
    }
  });
  
  fetchResponse.body.on('end', () => {
    console.log(`✅ Video stream completed successfully`);
  });
  
  // Add response event handlers for cleanup
  expressRes.on('error', (resError: Error) => {
    console.error(`❌ Response error:`, resError);
  });
}

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

    // No chunk size limits - allow full range requests for optimal performance

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
                // Continue with normal compressed version serving
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
                requestedQuality, // Use the requested quality
            );

            // If we found a compressed version, use it
            if (compressedUrl && compressedUrl !== objectName) {
              try {
                const signedUrl =
                  await gcsService.getSignedReadUrl(compressedUrl);
                
                // Handle HEAD requests differently - just return headers
                if (req.method === 'HEAD') {
                  try {
                    const headResponse = await fetch(signedUrl, { method: 'HEAD' });
                    if (headResponse.ok) {
                      // Copy relevant headers from the GCS response
                      const headersToCopy = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
                      headersToCopy.forEach(header => {
                        const value = headResponse.headers.get(header);
                        if (value) {
                          res.set(header, value);
                        }
                      });
                      
                      res.set({
                        'Cache-Control': 'public, max-age=3600',
                        'Access-Control-Allow-Origin': req.headers.origin || '*',
                        'Access-Control-Allow-Credentials': 'true',
                        'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
                      });
                      
                      return res.status(200).end();
                    }
                  } catch (headError) {
                    console.warn('HEAD request failed, falling back to original:', headError);
                    // Fall through to return 404
                  }
                }
                
                // For GET requests, proxy the video content to avoid CORS issues
                try {
                  // Prepare headers for the fetch request
                  const fetchHeaders: any = {};
                  if (req.headers.range) {
                    fetchHeaders['Range'] = req.headers.range;
                  }
                  // No initial range limit - let the client request what it needs
                  
                  // No timeout limits for hosted environment
                  const fetchOptions = {
                    headers: fetchHeaders,
                  };
                  
                  const response = await fetch(signedUrl, fetchOptions);
                  
                  if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                  }
                  
                  
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
                  
                  
                  // Stream the video content using helper function
                  await streamVideoContent(response, res);
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
                return res.status(404).json({
                  message: `Video quality ${requestedQuality} not available.`,
                  availableQualities: (item as any).compressedQualities || [],
                  compressionStatus: (item as any).compressionStatus,
                  fallbackToOriginal: true
                });
              }
            } else {
              return res.status(404).json({
                message: `Video quality ${requestedQuality} not available. Original video may have been compressed and deleted.`,
                availableQualities: (item as any).compressedQualities || [],
                compressionStatus: (item as any).compressionStatus,
                fallbackToOriginal: true
              });
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
              
              // Serve original video directly
              try {
                const fetchHeaders: any = {};
                if (req.headers.range) {
                  fetchHeaders['Range'] = req.headers.range;
                } else {
                  // No initial range limit - let the client request what it needs
                }
                
                const fetchOptions = {
                  headers: fetchHeaders,
                };
                
                const response = await fetch(signedUrl, fetchOptions);
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch original video: ${response.status} ${response.statusText}`);
                }
                
                // Video fetched successfully from GCS
                
                const responseHeaders: any = {
                  'Content-Type': response.headers.get('content-type') || item.contentType,
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': req.headers.origin || '*',
                  'Access-Control-Allow-Credentials': 'true',
                  'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
                };
                
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                  responseHeaders['Content-Length'] = contentLength;
                }
                
                const contentRange = response.headers.get('content-range');
                if (contentRange) {
                  responseHeaders['Content-Range'] = contentRange;
                }
                
                if (response.status === 206) {
                  res.status(206);
                } else {
                  res.status(200);
                }
                
                res.set(responseHeaders);
                
                // Stream the video content using helper function
                await streamVideoContent(response, res);
                return;
              } catch (proxyError) {
                console.error(`❌ Failed to proxy original video content during compression:`, proxyError);
                return res.status(500).json({
                  message: "Failed to stream video content",
                  error: String(proxyError)
                });
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
              
              // Serve original video directly
              try {
                const fetchHeaders: any = {};
                if (req.headers.range) {
                  fetchHeaders['Range'] = req.headers.range;
                } else {
                  // No initial range limit - let the client request what it needs
                }
                
                const fetchOptions = {
                  headers: fetchHeaders,
                };
                
                const response = await fetch(signedUrl, fetchOptions);
                
                if (!response.ok) {
                  throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }
                
                const responseHeaders: any = {
                  'Content-Type': response.headers.get('content-type') || item.contentType,
                  'Accept-Ranges': 'bytes',
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': req.headers.origin || '*',
                  'Access-Control-Allow-Credentials': 'true',
                  'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length'
                };
                
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                  responseHeaders['Content-Length'] = contentLength;
                }
                
                const contentRange = response.headers.get('content-range');
                if (contentRange) {
                  responseHeaders['Content-Range'] = contentRange;
                }
                
                if (response.status === 206) {
                  res.status(206);
                } else {
                  res.status(200);
                }
                
                res.set(responseHeaders);
                
                // Stream the video content using helper function
                await streamVideoContent(response, res);
                return;
              } catch (proxyError) {
                console.error(`❌ Failed to proxy original video content:`, proxyError);
                return res.status(500).json({
                  message: "Failed to stream video content",
                  error: String(proxyError)
                });
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
                // Instead of redirecting, proxy the video content to avoid CORS issues
                try {
                  // Prepare headers for the fetch request
                  const fetchHeaders: any = {};
                  if (req.headers.range) {
                    fetchHeaders['Range'] = req.headers.range;
                  }
                  // No initial range limit - let the client request what it needs
                  
                  // No timeout limits for hosted environment
                  const fetchOptions = {
                    headers: fetchHeaders,
                  };
                  
                  const response = await fetch(signedUrl, fetchOptions);
                  
                  if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                  }
                  
                  
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
                  
                  
                  // Stream the video content using helper function
                  await streamVideoContent(response, res);
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
