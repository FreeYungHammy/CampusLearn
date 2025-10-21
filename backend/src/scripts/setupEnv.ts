#!/usr/bin/env node

/**
 * Environment Setup Helper
 * Generates secure values for sensitive environment variables
 * Run with: npm run setup:env
 */

import EnvironmentValidator from '../utils/envValidator';
import crypto from 'crypto';

function generateSecureValue(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

function generateJwtSecret(): string {
  return EnvironmentValidator.generateJwtSecret();
}

function generateBase64Secret(): string {
  return crypto.randomBytes(32).toString('base64');
}

function main() {
  console.log('🔐 CampusLearn Environment Setup Helper');
  console.log('=======================================');
  console.log('');
  
  console.log('📋 REQUIRED Environment Variables:');
  console.log('==================================');
  console.log('');
  
  console.log('# Database & Cache (REQUIRED)');
  console.log('MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campuslearn?retryWrites=true&w=majority');
  console.log('REDIS_URL=redis://username:password@redis-host:port');
  console.log('');
  
  console.log('# Authentication (REQUIRED)');
  console.log(`JWT_SECRET=${generateJwtSecret()}`);
  console.log('');
  
  console.log('# Botpress Integration (REQUIRED)');
  console.log('BOTPRESS_CLIENT_ID=your-botpress-client-id');
  console.log('BOTPRESS_BOT_ID=your-botpress-bot-id');
  console.log('BOTPRESS_PAT=your-botpress-personal-access-token');
  console.log('BOTPRESS_WEBHOOK_URL=https://webhook.botpress.cloud/your-webhook-id');
  console.log(`BOTPRESS_INTERNAL_TOKEN=${generateSecureValue(32)}`);
  console.log(`BOTPRESS_CLAIM_SECRET=${generateSecureValue(32)}`);
  console.log('');
  
  console.log('🔒 SENSITIVE Environment Variables:');
  console.log('===================================');
  console.log('');
  
  console.log('# Google Cloud Storage (for file uploads)');
  console.log('GCS_BUCKET=tutor-student-videos');
  console.log('GCLOUD_PROJECT=your-gcp-project-id');
  console.log('# Choose ONE of these credential methods:');
  console.log('GCS_KEYFILE_JSON={"type":"service_account",...}');
  console.log('# OR');
  console.log(`GCS_KEYFILE_B64=${generateBase64Secret()}`);
  console.log('# OR');
  console.log('GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
  console.log('');
  
  console.log('# Email Service (Brevo)');
  console.log('SMTP_USER=your-brevo-smtp-login');
  console.log('SMTP_PASS=your-brevo-smtp-password');
  console.log('BREVO_API_KEY=your-brevo-api-key');
  console.log('');
  
  console.log('# Video Calls (Metered.ca)');
  console.log('METERED_API_KEY=your-metered-api-key');
  console.log('METERED_TURN_USERNAME=your-turn-username');
  console.log('METERED_TURN_PASSWORD=your-turn-password');
  console.log('');
  
  console.log('🛡️ SECURITY Environment Variables:');
  console.log('==================================');
  console.log('');
  
  console.log('# File Upload Security');
  console.log('MAX_FILE_SIZE=524288000  # 500MB');
  console.log('ENABLE_RATE_LIMIT=true  # Enable in production');
  console.log('UPLOAD_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes');
  console.log('UPLOAD_RATE_LIMIT_MAX=5  # 5 uploads per window');
  console.log('');
  
  console.log('# CORS Security');
  console.log('CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
  console.log('ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
  console.log('');
  
  console.log('# Logging');
  console.log('LOG_LEVEL=info  # error, warn, info, debug');
  console.log('');
  
  console.log('🚀 DEVELOPMENT Environment Variables:');
  console.log('=====================================');
  console.log('');
  
  console.log('NODE_ENV=development');
  console.log('PORT=5001');
  console.log('FRONTEND_URL=http://localhost:5173');
  console.log('BACKEND_URL=http://localhost:5001');
  console.log('CORS_ORIGINS=http://localhost:5173,http://localhost:8080');
  console.log('ENABLE_RATE_LIMIT=false  # Disable in development');
  console.log('');
  
  console.log('📝 INSTRUCTIONS:');
  console.log('================');
  console.log('1. Copy the values above to your backend/.env file');
  console.log('2. Replace placeholder values with your actual credentials');
  console.log('3. Never commit the .env file to version control');
  console.log('4. Use different values for development and production');
  console.log('5. Run "npm run validate:env" to check your configuration');
  console.log('');
  
  console.log('⚠️  SECURITY WARNINGS:');
  console.log('======================');
  console.log('- Keep your .env file secure and never share it');
  console.log('- Use strong, unique passwords for all services');
  console.log('- Enable rate limiting in production');
  console.log('- Use HTTPS in production');
  console.log('- Regularly rotate your JWT_SECRET');
  console.log('');
  
  console.log('✅ Generated secure values are ready to use!');
}

main();
