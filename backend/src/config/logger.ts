import winston from "winston";

export function createLogger(service: string) {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          `[${timestamp}] [${service}] ${level}: ${message}`,
      ),
    ),
    transports: [new winston.transports.Console()],
  });
}
