// Import commands.js using ES2015 syntax:
import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // You can add specific error messages to ignore if needed
  return false;
});

