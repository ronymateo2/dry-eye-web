import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, clearToken } from "./api";
import type { User } from "@/types/domain";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

type AuthContextType = {
  auth: AuthState;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const loadUser = async () => {
    const token = localStorage.getItem("weqe_token");
    if (!token) {
      setAuth({ status: "unauthenticated" });
      return;
    }
    try {
      const user = await api.getMe();
      setAuth({ status: "authenticated", user });
    } catch {
      clearToken();
      setAuth({ status: "unauthenticated" });
    }
  };

  useEffect(() => { loadUser(); }, []);

  const signOut = () => {
    clearToken();
    setAuth({ status: "unauthenticated" });
  };

  const refreshUser = async () => {
    try {
      const user = await api.getMe();
      setAuth({ status: "authenticated", user });
    } catch {
      signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ auth, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useUser(): User {
  const { auth } = useAuth();
  if (auth.status !== "authenticated") throw new Error("Not authenticated");
  return auth.user;
}

export function storeTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setToken(token);
    window.history.replaceState({}, "", window.location.pathname);
  }
  return token;
}
