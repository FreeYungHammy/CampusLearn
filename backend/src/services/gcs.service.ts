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
  console.log("  - GCS_KEYFILE_JSON length:", process.env.GCS_KEYFILE_JSON?.length || 0);
  
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
      console.error("JSON content preview:", env.gcsKeyJson?.substring(0, 100) + "...");
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

function parseBucketAndObject(objectName: string): { bucket: string; objectPath: string } {
  const cleaned = objectName.replace(/^gs:\/\//, "");
  const firstSlash = cleaned.indexOf("/");
  if (firstSlash > 0) {
    const maybeBucket = cleaned.slice(0, firstSlash);
    const objectPath = cleaned.slice(firstSlash + 1);
    // Treat first segment as bucket if it looks like a bucket name
    if (/^[a-z0-9][a-z0-9._-]{1,62}$/.test(maybeBucket)) {
      return { bucket: maybeBucket, objectPath };
    }
  }
  if (!env.gcsBucket) {
    throw new Error("GCS bucket not configured and no bucket specified in URI");
  }
  return { bucket: env.gcsBucket, objectPath: cleaned };
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

    await file.save(buffer, {
      contentType,
      resumable: false,
      public: false,
      metadata: { contentType },
    });

    return {
      bucket: env.gcsBucket,
      objectName: destination,
      publicUrl: `gs://${env.gcsBucket}/${destination}`,
    };
  },

  async getSignedReadUrl(objectName: string): Promise<string> {
    const client = getStorage();
    const { bucket, objectPath } = parseBucketAndObject(objectName);
    const file = client.bucket(bucket).file(objectPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + env.gcsSignedUrlTtlSeconds * 1000,
    });
    return url;
  },

  async deleteObject(objectName: string): Promise<void> {
    const client = getStorage();
    const { bucket, objectPath } = parseBucketAndObject(objectName);
    await client.bucket(bucket).file(objectPath).delete({ ignoreNotFound: true });
  },
};


