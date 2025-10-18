export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  mongoUri:
    process.env.MONGO_URI ??
    (() => {
      throw new Error("MONGO_URI environment variable is required");
    })(),
  jwtSecret:
    process.env.JWT_SECRET ??
    (() => {
      throw new Error("JWT_SECRET environment variable is required");
    })(),
  redisUrl:
    process.env.REDIS_URL ??
    (() => {
      throw new Error("REDIS_URL environment variable is required");
    })(),
  // Google Cloud Storage
  gcsBucket: process.env.GCS_BUCKET ?? "tutor-student-videos",
  gcsProjectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
  gcsKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  gcsKeyJson: process.env.GCS_KEYFILE_JSON, // inline JSON string
  gcsKeyBase64: process.env.GCS_KEYFILE_B64, // base64-encoded JSON
  gcsSignedUrlTtlSeconds: Number(
    process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 3600,
  ),
  // Video optimization settings
  videoCacheTtlSeconds: Number(process.env.VIDEO_CACHE_TTL_SECONDS ?? 3000),
  enableVideoTranscoding: process.env.ENABLE_VIDEO_TRANSCODING === "true",
  videoQualities: process.env.VIDEO_QUALITIES?.split(",") ?? [
    "720p",
    "480p",
    "360p",
  ],

  // Advanced video settings
  videoCompressionEnabled: process.env.VIDEO_COMPRESSION_ENABLED === "true",
  videoInitialChunkSize: Number(
    process.env.VIDEO_INITIAL_CHUNK_SIZE ?? 2097152,
  ), // 2MB
  videoMaxChunkSize: Number(process.env.VIDEO_MAX_CHUNK_SIZE ?? 10485760), // 10MB

  // CDN Configuration
  cdnEnabled: process.env.CDN_ENABLED === "true",
  cdnBaseUrl: process.env.CDN_BASE_URL ?? "",
  cdnCacheTtl: Number(process.env.CDN_CACHE_TTL ?? 86400), // 24 hours
  cdnProvider: process.env.CDN_PROVIDER ?? "google-cloud",
  // Botpress
  botpressClientId: process.env.BOTPRESS_CLIENT_ID,
  botpressBotId: process.env.BOTPRESS_BOT_ID,
  botpressPat: process.env.BOTPRESS_PAT, // Personal Access Token
  botpressWebhookUrl:
    process.env.BOTPRESS_WEBHOOK_URL ??
    (() => {
      throw new Error("BOTPRESS_WEBHOOK_URL environment variable is required");
    })(),

  // Test user credentials (for development/testing only)
  testUserEmail:
    process.env.TEST_USER_EMAIL ?? "test.student@student.belgiumcampus.ac.za",
  testUserPassword: process.env.TEST_USER_PASSWORD ?? "password123",

  // Development URLs
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL ?? "http://localhost:5001",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") ?? [
    "http://localhost:5173",
    "http://localhost:8080",
    "https://campuslearn.onrender.com",
  ],
};
