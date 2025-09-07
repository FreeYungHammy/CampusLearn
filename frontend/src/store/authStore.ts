import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type User } from "../types/Users";
import { logout as logoutApi } from "../services/authApi";

interface AuthState {
  token: string | null;
  user: User | null;
  showLogoutModal: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      showLogoutModal: false,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: async () => {
        await logoutApi();
        set({ token: null, user: null, showLogoutModal: false });
      },
      openLogoutModal: () => set({ showLogoutModal: true }),
      closeLogoutModal: () => set({ showLogoutModal: false }),
    }),
    {
      name: "auth-storage", // name of the item in the storage (must be unique)
    },
  ),
);
