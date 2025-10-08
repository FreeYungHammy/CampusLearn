export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  mongoUri:
    process.env.MONGO_URI ??
    "mongodb+srv://Gabriel:admin1@campuslearn.ukgqknw.mongodb.net/campuslearn?retryWrites=true&w=majority&appName=CampusLearn",
  jwtSecret:
    process.env.JWT_SECRET ??
    "Cw_e94TFCNIAWSe-e52FF4R9fqMV7ghJ6LZUL_JuZBhqne1mnP3Gv7bTNuDE3Hu5BC3xeONS52e-ZPMCLpVfwA",
  redisUrl: process.env.REDIS_URL ?? "REDIS_URL=redis://default:5GfBijg1gkOa8njzhegOEunZgScxTiJq@redis-15014.c341.af-south-1-1.ec2.redns.redis-cloud.com:15014",
  // Google Cloud Storage
  gcsBucket: process.env.GCS_BUCKET ?? "tutor-student-videos",
  gcsProjectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
  gcsKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  gcsKeyJson: process.env.GCS_KEYFILE_JSON, // inline JSON string
  gcsKeyBase64: process.env.GCS_KEYFILE_B64, // base64-encoded JSON
  gcsSignedUrlTtlSeconds: Number(process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 3600),
  // Botpress
  botpressClientId: process.env.BOTPRESS_CLIENT_ID,
  botpressBotId: process.env.BOTPRESS_BOT_ID,
  botpressPat: process.env.BOTPRESS_PAT, // Personal Access Token
};
