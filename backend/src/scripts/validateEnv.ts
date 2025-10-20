#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates environment configuration and exits with appropriate code
 * Run with: npm run validate:env
 */

import EnvironmentValidator from '../utils/envValidator';

function main() {
  console.log('🔍 Validating environment configuration...');
  console.log('');
  
  const result = EnvironmentValidator.validate();
  EnvironmentValidator.logValidationResults(result);
  
  console.log('');
  
  if (result.isValid) {
    console.log('✅ Environment validation PASSED');
    console.log('🚀 Your environment is ready for deployment!');
    process.exit(0);
  } else {
    console.log('❌ Environment validation FAILED');
    console.log('🔧 Please fix the issues above before deploying');
    process.exit(1);
  }
}

main();
