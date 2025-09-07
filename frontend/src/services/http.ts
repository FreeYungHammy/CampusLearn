import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { redirect } from "react-router-dom";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const http = axios.create({
  baseURL, // ← actually use it
  withCredentials: true, // if you’re using cookie-based auth
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
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
