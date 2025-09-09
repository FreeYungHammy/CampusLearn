import axios from "axios";

export function resolveBaseUrl(): string {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL as
    | string
    | undefined;
  if (configured && /^(https?:)?\/\//.test(configured)) return configured; // absolute
  if (configured && configured.startsWith("/")) {
    // Always map relative to backend dev server (no Vite proxy configured)
    return "http://localhost:5001" + configured;
  }
  // default: explicit backend dev URL
  return "http://localhost:5001/api";
}

export const apiBaseUrl = resolveBaseUrl();

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export default api;
