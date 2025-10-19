// Centralized logging configuration
export const LOGGING_CONFIG = {
  // Services that should have minimal logging even in development
  QUIET_SERVICES: [
    'CacheService',
    'ChatService', 
    'ForumService',
    'TutorService',
    'StudentService'
  ],
  
  // Services that should only log errors in production
  ERROR_ONLY_IN_PROD: [
    'MongooseService',
    'RedisService',
    'EmailService'
  ],
  
  // Services that can have full logging in development
  VERBOSE_SERVICES: [
    'ServerService',
    'AuthService',
    'VideoService'
  ]
};

export const shouldLog = (service: string, level: string): boolean => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // In production, only log warnings and errors
  if (isProduction) {
    return level === 'warn' || level === 'error';
  }
  
  // In development, reduce logging for quiet services
  if (LOGGING_CONFIG.QUIET_SERVICES.includes(service)) {
    return level === 'warn' || level === 'error';
  }
  
  // For verbose services, allow all levels in development
  if (LOGGING_CONFIG.VERBOSE_SERVICES.includes(service)) {
    return true;
  }
  
  // Default: allow debug and above
  return level !== 'silly';
};
