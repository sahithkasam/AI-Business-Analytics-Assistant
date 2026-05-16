import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        Cookies.set("access_token", accessToken, {
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          expires: 1, // 1 day
        });
        Cookies.set("refresh_token", refreshToken, {
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          expires: 30,
        });
        set({ user, accessToken });
      },

      clearAuth: () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        set({ user: null, accessToken: null });
      },

      isAuthenticated: () => {
        return !!get().user && !!Cookies.get("access_token");
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
