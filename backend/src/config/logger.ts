import winston from "winston";
import { LOGGING_CONFIG, shouldLog } from "./logging";

export function createLogger(service: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Custom filter to control what gets logged
  const logFilter = winston.format((info) => {
    if (!shouldLog(service, info.level)) {
      return false;
    }
    return info;
  });
  
  return winston.createLogger({
    level: isProduction ? "warn" : "debug",
    format: winston.format.combine(
      logFilter(),
      winston.format.colorize({ all: !isProduction }),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(
        ({ timestamp, level, message }) =>
          isProduction 
            ? `${timestamp} [${service}] ${level}: ${message}`
            : `[${timestamp}] [${service}] ${level}: ${message}`,
      ),
    ),
    transports: [new winston.transports.Console()],
  });
}
