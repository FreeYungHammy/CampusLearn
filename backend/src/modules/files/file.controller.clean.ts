import { Request, Response, NextFunction } from "express";
import { FileService } from "./file.service";
import multer from "multer";
import { AuthedRequest } from "../../auth/auth.middleware";
import mime from "mime-types";
import fetch from "node-fetch";

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
      // Set CORS headers for video requests
      const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080', 'https://campuslearn.onrender.com', 'https://www.campuslearn.app', 'https://campuslearn.app'];
      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin as string)) {
        res.header('Access-Control-Allow-Origin', origin as string);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

      const item = await FileService.getWithBinary(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "File not found" });
      }

      // If file is stored in GCS, handle video streaming
      if ((item as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const { VideoCompressionService } = await import("../../services/video-compression.service");

        const objectName = String((item as any).externalUri).replace(/^gs:\/\//, "");

        // Handle range requests for video streaming
        if (req.headers.range && item.contentType.startsWith("video/")) {
          return handleRangeRequest(req, res, objectName, item.contentType);
        }

        // Handle quality parameter for video files
        if (item.contentType.startsWith("video/") && req.query.quality) {
          const requestedQuality = String(req.query.quality);
          try {
            const compressedUrl = await VideoCompressionService.getBestQualityUrl(
              objectName,
              undefined,
              requestedQuality,
            );

            if (compressedUrl && compressedUrl !== objectName) {
              try {
                const signedUrl = await gcsService.getSignedReadUrl(compressedUrl);
                
                // Proxy the video content to avoid CORS issues
                try {
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
                    'Access-Control-Allow-Origin': origin as string,
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
                  
                  // Stream the video content
                  if (response.body) {
                    response.body.pipe(res);
                  } else {
                    throw new Error('No response body available');
                  }
                  return;
                } catch (proxyError) {
                  console.error('Failed to proxy video content:', proxyError);
                  return res.status(500).json({
                    message: "Failed to stream video content",
                  });
                }
              } catch (error) {
                console.error('Failed to generate signed URL for compressed version:', error);
                return res.status(500).json({
                  message: "Failed to generate video URL",
                });
              }
            } else {
              return res.status(404).json({
                message: `Video quality ${requestedQuality} not available.`,
              });
            }
          } catch (error) {
            console.error('Failed to get compressed version:', error);
            return res.status(404).json({
              message: "Video quality not available due to processing error.",
            });
          }
        }

        // For videos without quality parameter, try to serve a default quality
        if (item.contentType.startsWith("video/")) {
          try {
            const defaultQualityUrl = await VideoCompressionService.getBestQualityUrl(
              objectName,
              undefined,
              "480p", // Default to 480p
            );

            if (defaultQualityUrl && defaultQualityUrl !== objectName) {
              try {
                const signedUrl = await gcsService.getSignedReadUrl(defaultQualityUrl);
                
                // Proxy the video content to avoid CORS issues
                try {
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
                    'Access-Control-Allow-Origin': origin as string,
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
                  
                  // Stream the video content
                  if (response.body) {
                    response.body.pipe(res);
                  } else {
                    throw new Error('No response body available');
                  }
                  return;
                } catch (proxyError) {
                  console.error('Failed to proxy video content:', proxyError);
                  return res.status(500).json({
                    message: "Failed to stream video content",
                  });
                }
              } catch (error) {
                console.error('Failed to generate signed URL for default compressed version:', error);
                return res.status(500).json({
                  message: "Failed to generate video URL",
                });
              }
            } else {
              return res.status(404).json({
                message: "No compressed versions available",
              });
            }
          } catch (error) {
            console.error('Failed to get default compressed version:', error);
            return res.status(404).json({
              message: "Video not available",
            });
          }
        }

        // For non-video files, redirect directly to GCS
        const signedUrl = await gcsService.getSignedReadUrl(objectName);
        res.redirect(signedUrl);
        return;
      }

      // If file is stored locally, serve it directly
      if (item.content) {
        res.setHeader("Content-Type", item.contentType);
        res.setHeader("Content-Length", item.content.length);
        res.send(item.content);
        return;
      }

      res.status(404).json({ message: "File content not found" });
    } catch (error) {
      console.error('File serving error:', error);
      next(error);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await FileService.getMeta(req.params.id);
      if (!item) return res.status(404).json({ message: "File not found" });

      // If file is stored in GCS, delete it from there too
      if ((item as any).externalUri) {
        const { gcsService } = await import("../../services/gcs.service");
        const objectName = String((item as any).externalUri).replace(/^gs:\/\//, "");
        await gcsService.deleteObject(objectName);
      }

      await FileService.remove(req.params.id);
      res.json({ message: "File deleted successfully" });
    } catch (e) {
      next(e);
    }
  },
};
