import { Storage } from "@google-cloud/storage";
import path from "path";
import { env } from "../config/env";

export type GcsUploadResult = {
  bucket: string;
  objectName: string;
  publicUrl: string; // gs://bucket/objectName
};

let storage: Storage | null = null;

function getStorage(): Storage {
  if (storage) return storage;

  console.log("GCS: Initializing Storage client...");
  console.log("GCS: Environment variables:");
  console.log("  - GCS_BUCKET:", process.env.GCS_BUCKET);
  console.log("  - GOOGLE_CLOUD_PROJECT:", process.env.GOOGLE_CLOUD_PROJECT);
  console.log("  - GCS_KEYFILE_JSON exists:", !!process.env.GCS_KEYFILE_JSON);
  console.log(
    "  - GCS_KEYFILE_JSON length:",
    process.env.GCS_KEYFILE_JSON?.length || 0,
  );

  // Build credentials from env (inline JSON, base64, or file path)
  let options: any = {};

  if (env.gcsProjectId) {
    options.projectId = env.gcsProjectId;
    console.log("GCS: Set projectId to:", env.gcsProjectId);
  }

  if (env.gcsKeyJson) {
    try {
      options.credentials = JSON.parse(env.gcsKeyJson);
      console.log("GCS: Successfully parsed inline JSON credentials");
    } catch (e) {
      console.error("Failed to parse GCS_KEYFILE_JSON:", e);
      console.error(
        "JSON content preview:",
        env.gcsKeyJson?.substring(0, 100) + "...",
      );
    }
  } else if (env.gcsKeyBase64) {
    try {
      const json = Buffer.from(env.gcsKeyBase64, "base64").toString("utf-8");
      options.credentials = JSON.parse(json);
      console.log("GCS: Successfully parsed base64 JSON credentials");
    } catch (e) {
      console.error("Failed to parse GCS_KEYFILE_B64:", e);
    }
  } else if (env.gcsKeyFile) {
    options.keyFilename = env.gcsKeyFile;
    console.log("GCS: Using key file:", env.gcsKeyFile);
  } else {
    console.warn("GCS: No credentials found in environment variables");
  }

  console.log("GCS: Final options:", JSON.stringify(options, null, 2));

  // Always pass options, even if empty - this prevents fallback to default credentials
  storage = new Storage(options);
  return storage;
}

function parseBucketAndObject(objectName: string): {
  bucket: string;
  objectPath: string;
} {
  // If it's a full gs:// URI, parse it properly.
  if (objectName.startsWith("gs://")) {
    const cleaned = objectName.substring(5); // remove "gs://"
    const firstSlash = cleaned.indexOf("/");
    if (firstSlash > 0) {
      const bucket = cleaned.slice(0, firstSlash);
      const objectPath = cleaned.slice(firstSlash + 1);
      return { bucket, objectPath };
    }
    // It's something like "gs://my-bucket", which means the root.
    return { bucket: cleaned, objectPath: "" };
  }

  // Otherwise, assume the entire string is the object path and use the env var for the bucket.
  if (!env.gcsBucket) {
    throw new Error(
      "GCS bucket not configured in environment, and a relative path was provided.",
    );
  }
  return { bucket: env.gcsBucket, objectPath: objectName };
}

export const gcsService = {
  isEnabled(): boolean {
    return Boolean(env.gcsBucket);
  },

  async uploadBuffer(
    buffer: Buffer,
    contentType: string,
    destination: string,
  ): Promise<GcsUploadResult> {
    if (!env.gcsBucket) throw new Error("GCS bucket not configured");
    const client = getStorage();
    const bucket = client.bucket(env.gcsBucket);
    const file = bucket.file(destination);

    try {
      console.log(`GCS: Uploading buffer to ${destination}, size: ${buffer.length} bytes`);
      
      await file.save(buffer, {
        contentType,
        resumable: true, // Enable resumable uploads for better reliability
        public: false,
        metadata: { 
          contentType,
          cacheControl: 'public, max-age=3600'
        },
        validation: 'crc32c', // Use CRC32C validation
      });

      console.log(`GCS: Successfully uploaded ${destination}`);
      
      return {
        bucket: env.gcsBucket,
        objectName: destination,
        publicUrl: `gs://${env.gcsBucket}/${destination}`,
      };
    } catch (error) {
      console.error(`GCS: Upload failed for ${destination}:`, error);
      throw error;
    }
  },

  async uploadBufferSimple(
    buffer: Buffer,
    contentType: string,
    destination: string,
  ): Promise<GcsUploadResult> {
    if (!env.gcsBucket) throw new Error("GCS bucket not configured");
    const client = getStorage();
    const bucket = client.bucket(env.gcsBucket);
    const file = bucket.file(destination);

    try {
      console.log(`GCS: Simple upload to ${destination}, size: ${buffer.length} bytes`);
      
      // Use createWriteStream for better stream handling
      const stream = file.createWriteStream({
        metadata: {
          contentType,
          cacheControl: 'public, max-age=3600'
        },
        resumable: false,
        validation: 'crc32c',
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error(`GCS: Stream error for ${destination}:`, error);
          reject(error);
        });

        stream.on('finish', () => {
          console.log(`GCS: Successfully uploaded ${destination}`);
          resolve({
            bucket: env.gcsBucket,
            objectName: destination,
            publicUrl: `gs://${env.gcsBucket}/${destination}`,
          });
        });

        stream.end(buffer);
      });
    } catch (error) {
      console.error(`GCS: Simple upload failed for ${destination}:`, error);
      throw error;
    }
  },

  async getSignedReadUrl(objectName: string): Promise<string> {
    // Import CacheService dynamically to avoid circular dependencies
    const { CacheService } = await import("../services/cache.service");

    const cacheKey = `gcs:signed-url:${objectName}`;

    // TEMPORARY: Disable caching to fix expired URL issue
    // Try to get from cache first
    try {
      const cached = await CacheService.get(cacheKey);
      if (cached && typeof cached === "string") {
        console.log(`GCS: Using cached signed URL for ${objectName}`);
        // TEMPORARY: Always generate new URL to avoid expired cache
        // return cached;
      }
    } catch (error) {
      console.warn(`GCS: Cache miss for ${objectName}:`, error);
    }

    const client = getStorage();
    const { bucket, objectPath } = parseBucketAndObject(objectName);

    console.log(
      `GCS: Generating new signed URL for bucket '${bucket}' and object '${objectPath}'`,
    );

    const file = client.bucket(bucket).file(objectPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + env.gcsSignedUrlTtlSeconds * 1000,
    });

    // TEMPORARY: Disable caching to fix expired URL issue
    // Cache the URL for 50 minutes (10 minutes before expiry)
    try {
      // await CacheService.set(cacheKey, url, 3000); // 50 minutes
      console.log(`GCS: Generated fresh signed URL for ${objectName} (caching disabled)`);
      console.log(`GCS: Full signed URL: ${url}`);
    } catch (error) {
      console.warn(`GCS: Failed to cache signed URL for ${objectName}:`, error);
    }

    return url;
  },

  async deleteObject(objectName: string): Promise<void> {
    const client = getStorage();
    const { bucket, objectPath } = parseBucketAndObject(objectName);
    await client
      .bucket(bucket)
      .file(objectPath)
      .delete({ ignoreNotFound: true });
  },
};
