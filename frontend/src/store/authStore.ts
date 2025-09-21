import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type User } from "../types/Common";
import { logout as logoutApi } from "../services/authApi";

interface AuthState {
  token: string | null;
  user: User | null;
  showLogoutModal: boolean;
  pfpTimestamps: { [userId: string]: number };

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  refreshPfpForUser: (userId: string) => void;

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
      pfpTimestamps: {},

      setToken: (token) => set({ token }),
      setUser: (user) => {
        if (user) {
          set((state) => ({
            user,
            pfpTimestamps: { ...state.pfpTimestamps, [user.id]: Date.now() },
          }));
        } else {
          set({ user: null });
        }
      },
      clearAuth: () =>
        set({ token: null, user: null, showLogoutModal: false, pfpTimestamps: {} }),
      refreshPfpForUser: (userId: string) =>
        set((state) => ({
          pfpTimestamps: { ...state.pfpTimestamps, [userId]: Date.now() },
        })),

      logout: async () => {
        const token = get().token;
        if (token) {
          await logoutApi(token);
        }
        set({ token: null, user: null, showLogoutModal: false, pfpTimestamps: {} });
      },

      openLogoutModal: () => set({ showLogoutModal: true }),
      closeLogoutModal: () => set({ showLogoutModal: false }),
    }),
    {
      name: "auth-storage",
      // Persist only auth identity and timestamps
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        pfpTimestamps: state.pfpTimestamps,
      }),
    },
  ),
);
