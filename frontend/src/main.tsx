import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./App.css";
import { BrowserRouter } from "react-router-dom";

// Global error handler for external services
window.addEventListener('error', (event) => {
  // Suppress known external service errors that don't affect functionality
  if (event.error?.message?.includes('webchat.js') || 
      event.error?.message?.includes('Request failed with status code 500') ||
      event.error?.message?.includes('Trace ID:')) {
    console.warn('🤖 Chatbot service error suppressed (non-critical):', event.error.message);
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections from external services
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('webchat.js') || 
      event.reason?.message?.includes('Request failed with status code 500') ||
      event.reason?.message?.includes('Trace ID:')) {
    console.warn('🤖 Chatbot service promise rejection suppressed (non-critical):', event.reason.message);
    event.preventDefault();
    return false;
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
