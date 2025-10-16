import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type User } from "../types/Common";
import { logout as logoutApi } from "../services/authApi";

// Botpress cleanup helpers
const isBpKey = (k: string) =>
  k.startsWith("bp:") ||
  k.startsWith("bp_") ||
  k.includes("webchat") ||
  k.includes("botpress");

function clearBotpressStorage() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (isBpKey(k)) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (isBpKey(k)) sessionStorage.removeItem(k);
    });
  } catch {}
}

function destroyWebchat() {
  try {
    (window as any).botpress?.sendEvent?.({ type: "reset" });
    (window as any).botpress?.close?.();
    (window as any).botpress?.destroy?.(); // if available
  } catch {}
}

interface AuthState {
  token: string | null;
  user: User | null;
  showLogoutModal: boolean;
  pfpTimestamps: { [userId: string]: number };

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  refreshPfpForUser: (userId: string, timestamp?: number) => void;
  updatePfpTimestamps: (timestamps: { [userId: string]: number }) => void;

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
            pfpTimestamps: {
              ...state.pfpTimestamps,
              [user.id]: user.pfpTimestamp || Date.now(),
            },
          }));
        } else {
          set({ user: null });
        }
      },
      clearAuth: () =>
        set({
          token: null,
          user: null,
          showLogoutModal: false,
          pfpTimestamps: {},
        }),
      refreshPfpForUser: (userId: string, timestamp?: number) =>
        set((state) => ({
          pfpTimestamps: {
            ...state.pfpTimestamps,
            [userId]: timestamp || Date.now(),
          },
        })),
      updatePfpTimestamps: (timestamps: { [userId: string]: number }) =>
        set((state) => ({
          pfpTimestamps: { ...state.pfpTimestamps, ...timestamps },
        })),

      logout: async () => {
        const token = get().token;
        if (token) {
          try {
            await logoutApi(token);
          } catch {
            /* ignore */
          }
        }

        //Kill the Botpress session & cached convo so the next user starts fresh
        destroyWebchat();
        clearBotpressStorage();

        // Your existing state reset
        set({
          token: null,
          user: null,
          showLogoutModal: false,
          pfpTimestamps: {},
        });
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
