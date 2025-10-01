import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { redirect } from "react-router-dom";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const http = axios.create({
  baseURL, // ← actually use it
  withCredentials: true, // if you're using cookie-based auth
  headers: { "Content-Type": "application/json" },
});

// Add authorization header to all requests
http.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    console.log('🔑 HTTP Interceptor - Token available:', !!token);
    console.log('🌐 HTTP Interceptor - Request URL:', config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ HTTP Interceptor - Authorization header added');
    } else {
      console.log('❌ HTTP Interceptor - No token available');
    }
    return config;
  },
  (error) => {
    console.error('❌ HTTP Interceptor - Request error:', error);
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (r) => {
    console.log('✅ HTTP Response - Status:', r.status, 'URL:', r.config.url);
    return r;
  },
  (err) => {
    console.error('❌ HTTP Response Error - Status:', err.response?.status, 'URL:', err.config?.url);
    console.error('❌ HTTP Response Error - Data:', err.response?.data);
    if (err.response?.status === 401) {
      const { clearAuth, closeLogoutModal } = useAuthStore.getState();
      closeLogoutModal?.(); // optional UX tidy-up
      clearAuth(); // ← no type errors anymore
      redirect("/login");
    }
    return Promise.reject(err);
  },
);

export default http;
