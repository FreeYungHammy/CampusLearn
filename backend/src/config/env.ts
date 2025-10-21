export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: (() => {
    const portValue = process.env.PORT ?? 5001;
    // Extract just the number from strings like "production5000"
    const numericPort = portValue.toString().replace(/[^0-9]/g, '');
    const parsedPort = Number(numericPort) || 5001;
    console.log(`[env] PORT env var: "${process.env.PORT}", extracted: "${numericPort}", parsed: ${parsedPort}`);
    return parsedPort;
  })(),
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

  // Advanced video settings - no limits for hosted environment
  videoCompressionEnabled: process.env.VIDEO_COMPRESSION_ENABLED === "true",
  videoInitialChunkSize: Number(
    process.env.VIDEO_INITIAL_CHUNK_SIZE ?? 0,
  ), // No limit
  videoMaxChunkSize: Number(process.env.VIDEO_MAX_CHUNK_SIZE ?? 0), // No limit

  // CDN Configuration
  cdnEnabled: process.env.CDN_ENABLED === "true",
  cdnBaseUrl: process.env.CDN_BASE_URL ?? "",
  cdnCacheTtl: Number(process.env.CDN_CACHE_TTL ?? 86400), // 24 hours
  cdnProvider: process.env.CDN_PROVIDER ?? "google-cloud",
  
  // Metered.ca Video Call Configuration
  meteredAppName: process.env.METERED_APP_NAME,
  meteredApiKey: process.env.METERED_API_KEY,
  meteredTurnUsername: process.env.METERED_TURN_USERNAME,
  meteredTurnPassword: process.env.METERED_TURN_PASSWORD,
  meteredTurnExpirySeconds: Number(process.env.METERED_TURN_EXPIRY_SECONDS || 3600),
  stunUrls: process.env.STUN_URLS || "stun:stun.l.google.com:19302",
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
    "https://www.campuslearn-api.run.place",
    "https://campuslearn-api.run.place",
  ],
  
  // Security Configuration
  maxFileSize: Number(process.env.MAX_FILE_SIZE ?? 500 * 1024 * 1024), // 500MB
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  
  // Upload rate limiting configuration - disabled for hosted environment
  uploadRateLimitWindowMs: 0, // No upload rate limiting
  uploadRateLimitMax: 0, // No upload rate limiting
};
