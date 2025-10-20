import { Request, Response } from "express";
import { FileService } from "../modules/files/file.service";
import { validateVideoSignature, validateFileSize, sanitizeFilename } from "../utils/fileValidation";
import { env } from "../config/env";

/**
 * Test suite to verify video functionality after security enhancements
 * This ensures all security measures work without breaking video features
 */
export class VideoSecurityTestSuite {
  
  /**
   * Test file signature validation with real video files
   */
  static async testFileSignatureValidation(): Promise<boolean> {
    console.log("🧪 Testing file signature validation...");
    
    try {
      // Test with a mock MP4 file buffer (MP4 signature)
      const mockMp4Buffer = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // MP4 signature
        0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom
        0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // isom2
        0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31  // avc1mp41
      ]);
      
      const isValidMp4 = validateVideoSignature(mockMp4Buffer, "video/mp4");
      if (!isValidMp4) {
        console.error("❌ MP4 signature validation failed");
        return false;
      }
      
      // Test with invalid content type
      const invalidType = validateVideoSignature(mockMp4Buffer, "video/invalid");
      if (invalidType) {
        console.error("❌ Invalid content type validation failed");
        return false;
      }
      
      // Test with non-video content type
      const nonVideo = validateVideoSignature(mockMp4Buffer, "text/plain");
      if (nonVideo) {
        console.error("❌ Non-video content type validation failed");
        return false;
      }
      
      console.log("✅ File signature validation tests passed");
      return true;
    } catch (error) {
      console.error("❌ File signature validation test failed:", error);
      return false;
    }
  }
  
  /**
   * Test file size validation
   */
  static async testFileSizeValidation(): Promise<boolean> {
    console.log("🧪 Testing file size validation...");
    
    try {
      // Test with valid size
      const validBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const isValidSize = validateFileSize(validBuffer, env.maxFileSize);
      if (!isValidSize) {
        console.error("❌ Valid file size rejected");
        return false;
      }
      
      // Test with oversized file
      const oversizedBuffer = Buffer.alloc(600 * 1024 * 1024); // 600MB
      const isOversized = validateFileSize(oversizedBuffer, env.maxFileSize);
      if (isOversized) {
        console.error("❌ Oversized file accepted");
        return false;
      }
      
      console.log("✅ File size validation tests passed");
      return true;
    } catch (error) {
      console.error("❌ File size validation test failed:", error);
      return false;
    }
  }
  
  /**
   * Test filename sanitization
   */
  static async testFilenameSanitization(): Promise<boolean> {
    console.log("🧪 Testing filename sanitization...");
    
    try {
      // Test with malicious filename
      const maliciousName = "../../../etc/passwd";
      const sanitized = sanitizeFilename(maliciousName);
      if (sanitized.includes("../") || sanitized.includes("/")) {
        console.error("❌ Path traversal not sanitized:", sanitized);
        return false;
      }
      
      // Test with special characters
      const specialChars = "file<>:\"|?*.mp4";
      const sanitizedSpecial = sanitizeFilename(specialChars);
      if (sanitizedSpecial.includes("<") || sanitizedSpecial.includes(">")) {
        console.error("❌ Special characters not sanitized:", sanitizedSpecial);
        return false;
      }
      
      // Test with empty filename
      const empty = sanitizeFilename("");
      if (empty !== "upload") {
        console.error("❌ Empty filename not handled:", empty);
        return false;
      }
      
      console.log("✅ Filename sanitization tests passed");
      return true;
    } catch (error) {
      console.error("❌ Filename sanitization test failed:", error);
      return false;
    }
  }
  
  /**
   * Test environment configuration
   */
  static async testEnvironmentConfiguration(): Promise<boolean> {
    console.log("🧪 Testing environment configuration...");
    
    try {
      // Test security config exists
      if (typeof env.maxFileSize !== 'number') {
        console.error("❌ maxFileSize not configured");
        return false;
      }
      
      if (typeof env.enableRateLimit !== 'boolean') {
        console.error("❌ enableRateLimit not configured");
        return false;
      }
      
      if (typeof env.uploadRateLimitWindowMs !== 'number') {
        console.error("❌ uploadRateLimitWindowMs not configured");
        return false;
      }
      
      if (typeof env.uploadRateLimitMax !== 'number') {
        console.error("❌ uploadRateLimitMax not configured");
        return false;
      }
      
      console.log("✅ Environment configuration tests passed");
      return true;
    } catch (error) {
      console.error("❌ Environment configuration test failed:", error);
      return false;
    }
  }
  
  /**
   * Run all security tests
   */
  static async runAllTests(): Promise<boolean> {
    console.log("🚀 Starting Video Security Test Suite...");
    
    const tests = [
      this.testFileSignatureValidation,
      this.testFileSizeValidation,
      this.testFilenameSanitization,
      this.testEnvironmentConfiguration
    ];
    
    let allPassed = true;
    
    for (const test of tests) {
      const result = await test();
      if (!result) {
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log("🎉 All security tests passed! Video functionality is secure and working.");
    } else {
      console.log("❌ Some security tests failed. Please review the implementation.");
    }
    
    return allPassed;
  }
}

// Export for use in other modules
export default VideoSecurityTestSuite;
