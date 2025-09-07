import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout() {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    function resetTimer() {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(logout, INACTIVITY_TIMEOUT);
    }

    function handleActivity() {
      resetTimer();
    }

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, [logout]);
}
