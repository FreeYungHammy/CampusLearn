import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type User } from "../types/Common";
import { logout as logoutApi } from "../services/authApi";

interface AuthState {
  token: string | null;
  user: User | null;
  showLogoutModal: boolean;

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;

  logout: () => Promise<void>;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      showLogoutModal: false,

      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null, showLogoutModal: false }),

      logout: async () => {
        const token = get().token;
        if (token) {
          await logoutApi(token);
        }
        set({ token: null, user: null, showLogoutModal: false });
      },

      openLogoutModal: () => set({ showLogoutModal: true }),
      closeLogoutModal: () => set({ showLogoutModal: false }),
    }),
    {
      name: "auth-storage",
      // Persist only auth identity; avoid persisting transient UI like the modal flag
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
);
