export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  mongoUri:
    process.env.MONGO_URI ??
    "mongodb+srv://Gabriel:admin1@campuslearn.ukgqknw.mongodb.net/?retryWrites=true&w=majority&appName=CampusLearn",
};
