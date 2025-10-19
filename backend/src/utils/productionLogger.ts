// Production-optimized logging utility
const isProduction = process.env.NODE_ENV === 'production';

export const prodLog = {
  // Only log in development
  debug: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  
  // Always log, but minimal in production
  info: (message: string, ...args: any[]) => {
    if (isProduction) {
      console.log(`[INFO] ${message}`);
    } else {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  // Always log warnings and errors
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

// Replace verbose console.logs with this
export const log = isProduction ? prodLog : {
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
};
