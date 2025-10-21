// Environment configuration for frontend
export const env = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5001",
  wsUrl: import.meta.env.VITE_WS_URL || "http://localhost:5001",
  
  // Development flags
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Feature flags
  enableVideoCalls: true,
  enableNotifications: true,
  enableVideoCallNotifications: import.meta.env.VITE_ENABLE_VIDEO_CALL_NOTIFICATIONS === "true",
  
  // WebRTC Configuration
  webrtc: {
    iceServersEndpoint: "/api/videos/ice-config",
    connectionTimeout: 30000, // 30 seconds
    maxReconnectAttempts: 5,
  },
  
  // Socket Configuration
  socket: {
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
    transports: ["websocket", "polling"] as const,
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string = ""): string => {
  const baseUrl = env.apiUrl.replace(/\/$/, "");
  const cleanEndpoint = endpoint.replace(/^\//, "");
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
};

// Helper function to get WebSocket URL
export const getWsUrl = (): string => {
  return env.wsUrl.replace(/\/$/, "");
};

// Validation
if (!env.apiUrl) {
  console.warn("VITE_API_URL not set, using default localhost URL");
}

if (!env.wsUrl) {
  console.warn("VITE_WS_URL not set, using default localhost URL");
}
