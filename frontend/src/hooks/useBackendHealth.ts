import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../lib/api";

const HEALTH_CHECK_INTERVAL = 5000; // Check every 5 seconds
const LOGOUT_DELAY = 5000; // 5 seconds delay before logout
const MAX_RETRIES = 3; // Number of failed attempts before considering backend down

export function useBackendHealth() {
  const { token, user, logout } = useAuthStore();
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeout = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    // Only run health checks if user is authenticated
    if (!token || !user) {
      return;
    }

    const checkBackendHealth = async () => {
      try {
        // Use the health endpoint which doesn't require authentication
        // We use the full path to avoid issues with the base URL
        await api.get("/health");
        
        // Reset retry count on successful health check
        retryCount.current = 0;
        
        // Clear any pending logout timeout
        if (logoutTimeout.current) {
          clearTimeout(logoutTimeout.current);
          logoutTimeout.current = null;
        }
      } catch (error) {
        console.warn("Backend health check failed:", error);
        retryCount.current += 1;
        
        // If we've exceeded max retries, schedule logout
        if (retryCount.current >= MAX_RETRIES) {
          console.warn(`Backend appears to be down after ${MAX_RETRIES} failed attempts. Scheduling logout in ${LOGOUT_DELAY}ms`);
          
          // Clear any existing logout timeout
          if (logoutTimeout.current) {
            clearTimeout(logoutTimeout.current);
          }
          
          // Schedule logout after the specified delay
          logoutTimeout.current = setTimeout(() => {
            console.log("Backend is unreachable. Logging out user...");
            alert("The server connection has been lost. You will be logged out for security reasons.");
            logout();
          }, LOGOUT_DELAY);
        }
      }
    };

    // Start health checking
    healthCheckInterval.current = setInterval(checkBackendHealth, HEALTH_CHECK_INTERVAL);
    
    // Run initial health check
    checkBackendHealth();

    return () => {
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
      if (logoutTimeout.current) {
        clearTimeout(logoutTimeout.current);
      }
    };
  }, [token, user, logout]);
}
