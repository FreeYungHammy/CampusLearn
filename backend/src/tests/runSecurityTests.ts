#!/usr/bin/env node

/**
 * Quick test script to verify video security implementation
 * Run with: npm run test:security
 */

import VideoSecurityTestSuite from './videoSecurityTests';

async function main() {
  console.log('🔒 Video Security Implementation Test');
  console.log('=====================================');
  
  try {
    const allTestsPassed = await VideoSecurityTestSuite.runAllTests();
    
    if (allTestsPassed) {
      console.log('\n✅ SUCCESS: All security measures implemented correctly');
      console.log('🎬 Video functionality is secure and ready for production');
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: Some security tests failed');
      console.log('🔧 Please review the implementation');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 ERROR: Test suite crashed:', error);
    process.exit(1);
  }
}

main();
