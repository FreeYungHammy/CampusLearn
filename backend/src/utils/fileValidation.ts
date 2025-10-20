import { createLogger } from "../config/logger";

const logger = createLogger("FileValidation");

export interface FileSignature {
  extension: string;
  mimeType: string;
  signatures: number[][];
}

// File signatures for common video formats
const VIDEO_SIGNATURES: FileSignature[] = [
  {
    extension: "mp4",
    mimeType: "video/mp4",
    signatures: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4 Box
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 Box variant
      [0x66, 0x74, 0x79, 0x70], // ftyp
    ]
  },
  {
    extension: "avi",
    mimeType: "video/avi",
    signatures: [
      [0x52, 0x49, 0x46, 0x46], // RIFF
    ]
  },
  {
    extension: "mov",
    mimeType: "video/quicktime",
    signatures: [
      [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // QuickTime
      [0x66, 0x74, 0x79, 0x70], // ftyp
    ]
  },
  {
    extension: "webm",
    mimeType: "video/webm",
    signatures: [
      [0x1A, 0x45, 0xDF, 0xA3], // WebM
    ]
  },
  {
    extension: "flv",
    mimeType: "video/x-flv",
    signatures: [
      [0x46, 0x4C, 0x56, 0x01], // FLV
    ]
  },
  {
    extension: "mkv",
    mimeType: "video/x-matroska",
    signatures: [
      [0x1A, 0x45, 0xDF, 0xA3], // Matroska
    ]
  }
];

/**
 * Validates file signature against known video formats
 * @param buffer File buffer to validate
 * @param contentType MIME type from upload
 * @returns true if valid video format, false otherwise
 */
export function validateVideoSignature(buffer: Buffer, contentType: string): boolean {
  try {
    // Check if content type indicates video
    if (!contentType.startsWith("video/")) {
      logger.warn(`Invalid content type for video: ${contentType}`);
      return false;
    }

    // Find matching signature for the content type
    const signature = VIDEO_SIGNATURES.find(sig => sig.mimeType === contentType);
    if (!signature) {
      logger.warn(`No signature found for content type: ${contentType}`);
      return false;
    }

    // Check if buffer is large enough for signature validation
    if (buffer.length < 8) {
      logger.warn(`File too small for signature validation: ${buffer.length} bytes`);
      return false;
    }

    // Check each signature pattern
    for (const pattern of signature.signatures) {
      if (checkSignaturePattern(buffer, pattern)) {
        logger.info(`Valid video signature found for ${contentType}`);
        return true;
      }
    }

    logger.warn(`No valid signature found for ${contentType}`);
    return false;
  } catch (error) {
    logger.error(`Error validating video signature:`, error);
    return false;
  }
}

/**
 * Checks if buffer starts with the given signature pattern
 * @param buffer File buffer
 * @param pattern Signature pattern to match
 * @returns true if pattern matches
 */
function checkSignaturePattern(buffer: Buffer, pattern: number[]): boolean {
  if (buffer.length < pattern.length) {
    return false;
  }

  for (let i = 0; i < pattern.length; i++) {
    if (buffer[i] !== pattern[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validates file size against configured limits
 * @param buffer File buffer
 * @param maxSize Maximum allowed size in bytes
 * @returns true if within limits
 */
export function validateFileSize(buffer: Buffer, maxSize: number): boolean {
  const isValid = buffer.length <= maxSize;
  if (!isValid) {
    logger.warn(`File size exceeds limit: ${buffer.length} bytes > ${maxSize} bytes`);
  }
  return isValid;
}

/**
 * Validates filename for security
 * @param filename Original filename
 * @returns sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, "").replace(/\/|\\/g, "_");
  
  // Replace special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Remove multiple underscores
  sanitized = sanitized.replace(/_{2,}/g, "_");
  
  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_|_$/g, "");
  
  // Limit length
  sanitized = sanitized.substring(0, 100);
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = "upload";
  }
  
  return sanitized;
}
