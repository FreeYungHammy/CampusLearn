import { createLogger } from "../config/logger";

const logger = createLogger("EnvValidation");

export interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Validates environment configuration for security and completeness
 */
export class EnvironmentValidator {
  
  /**
   * Required environment variables for production
   */
  private static readonly REQUIRED_VARS = [
    'MONGO_URI',
    'JWT_SECRET',
    'REDIS_URL',
    'BOTPRESS_WEBHOOK_URL',
    'BOTPRESS_INTERNAL_TOKEN',
    'BOTPRESS_CLAIM_SECRET'
  ];

  /**
   * Sensitive variables that should be set in production
   */
  private static readonly SENSITIVE_VARS = [
    'JWT_SECRET',
    'GCS_KEYFILE_JSON',
    'GCS_KEYFILE_B64',
    'BOTPRESS_PAT',
    'METERED_API_KEY',
    'METERED_TURN_PASSWORD',
    'SMTP_PASS',
    'BREVO_API_KEY',
    'DKIM_PRIVATE_KEY'
  ];

  /**
   * Security-related variables
   */
  private static readonly SECURITY_VARS = [
    'MAX_FILE_SIZE',
    'ENABLE_RATE_LIMIT',
    'UPLOAD_RATE_LIMIT_WINDOW_MS',
    'UPLOAD_RATE_LIMIT_MAX',
    'LOG_LEVEL',
    'ALLOWED_ORIGINS'
  ];

  /**
   * Validates all environment variables
   */
  static validate(): EnvValidationResult {
    const result: EnvValidationResult = {
      isValid: true,
      missing: [],
      warnings: [],
      recommendations: []
    };

    // Check required variables
    for (const varName of this.REQUIRED_VARS) {
      if (!process.env[varName]) {
        result.missing.push(varName);
        result.isValid = false;
      }
    }

    // Check sensitive variables
    for (const varName of this.SENSITIVE_VARS) {
      if (!process.env[varName]) {
        result.warnings.push(`Sensitive variable ${varName} not set`);
      }
    }

    // Check security variables
    for (const varName of this.SECURITY_VARS) {
      if (!process.env[varName]) {
        result.recommendations.push(`Security variable ${varName} not set (using default)`);
      }
    }

    // Additional validations
    this.validateJwtSecret(result);
    this.validateFileSize(result);
    this.validateCorsOrigins(result);
    this.validateGcsConfiguration(result);

    return result;
  }

  /**
   * Validates JWT secret strength
   */
  private static validateJwtSecret(result: EnvValidationResult): void {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        result.warnings.push('JWT_SECRET is too short (minimum 32 characters recommended)');
      }
      if (jwtSecret === 'your-super-secret-jwt-key-here') {
        result.warnings.push('JWT_SECRET is using default value - change immediately!');
      }
    }
  }

  /**
   * Validates file size configuration
   */
  private static validateFileSize(result: EnvValidationResult): void {
    const maxFileSize = process.env.MAX_FILE_SIZE;
    if (maxFileSize) {
      const size = parseInt(maxFileSize);
      if (isNaN(size) || size <= 0) {
        result.warnings.push('MAX_FILE_SIZE must be a positive number');
      } else if (size > 1024 * 1024 * 1024) { // 1GB
        result.warnings.push('MAX_FILE_SIZE is very large (>1GB) - consider security implications');
      }
    }
  }

  /**
   * Validates CORS origins configuration
   */
  private static validateCorsOrigins(result: EnvValidationResult): void {
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
      const origins = corsOrigins.split(',').map(o => o.trim());
      if (origins.includes('*')) {
        result.warnings.push('CORS_ORIGINS contains wildcard (*) - security risk in production');
      }
      if (origins.some(o => o.includes('localhost') && process.env.NODE_ENV === 'production')) {
        result.warnings.push('CORS_ORIGINS contains localhost in production');
      }
    }
  }

  /**
   * Validates Google Cloud Storage configuration
   */
  private static validateGcsConfiguration(result: EnvValidationResult): void {
    const hasGcsKeyJson = !!process.env.GCS_KEYFILE_JSON;
    const hasGcsKeyBase64 = !!process.env.GCS_KEYFILE_B64;
    const hasGcsKeyFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!hasGcsKeyJson && !hasGcsKeyBase64 && !hasGcsKeyFile) {
      result.warnings.push('No GCS credentials configured - file uploads will not work');
    }

    if ((hasGcsKeyJson ? 1 : 0) + (hasGcsKeyBase64 ? 1 : 0) + (hasGcsKeyFile ? 1 : 0) > 1) {
      result.warnings.push('Multiple GCS credential methods configured - use only one');
    }
  }

  /**
   * Generates a secure JWT secret
   */
  static generateJwtSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Logs validation results
   */
  static logValidationResults(result: EnvValidationResult): void {
    if (result.isValid) {
      logger.info('✅ Environment validation passed');
    } else {
      logger.error('❌ Environment validation failed');
    }

    if (result.missing.length > 0) {
      logger.error(`Missing required variables: ${result.missing.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => logger.warn(`⚠️ ${warning}`));
    }

    if (result.recommendations.length > 0) {
      result.recommendations.forEach(rec => logger.info(`💡 ${rec}`));
    }
  }
}

export default EnvironmentValidator;
