export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  mongoUri:
    process.env.MONGO_URI ??
    "mongodb+srv://Gabriel:admin1@campuslearn.ukgqknw.mongodb.net/campuslearn?retryWrites=true&w=majority&appName=CampusLearn",
  jwtSecret:
    process.env.JWT_SECRET ??
    "Cw_e94TFCNIAWSe-e52FF4R9fqMV7ghJ6LZUL_JuZBhqne1mnP3Gv7bTNuDE3Hu5BC3xeONS52e-ZPMCLpVfwA",
  HUGGINGFACE_API_KEY: "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",
};
