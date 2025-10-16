import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { redirect } from "react-router-dom";

export function resolveBaseUrl(): string {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL as
    | string
    | undefined;
  if (configured && /^(https?:)?\/\//.test(configured)) return configured; // absolute
  if (configured && configured.startsWith("/")) {
    // Always map relative to backend dev server (no Vite proxy configured)
        return (import.meta.env.VITE_API_URL || "http://localhost:5001") + configured;
  }
  // default: explicit backend dev URL
  return (import.meta.env.VITE_API_URL || "http://localhost:5001") + "/api";
}

export const apiBaseUrl = resolveBaseUrl();

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// Add 401 interceptor to handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { clearAuth, closeLogoutModal } = useAuthStore.getState();
      closeLogoutModal?.();
      clearAuth();
      redirect("/login");
    }
    return Promise.reject(error);
  },
);

export default api;
