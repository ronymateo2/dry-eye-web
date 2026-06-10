import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setToken, clearToken } from "@/lib/http";
import { userApi } from "@/features/user";
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
      const user = await userApi.getMe();
      setAuth({ status: "authenticated", user });
    } catch {
      clearToken();
      setAuth({ status: "unauthenticated" });
    }
  };

  useEffect(() => { loadUser(); }, []);

  const signOut = () => {
    // Revoca server-side (best-effort) antes de borrar el token local, para que
    // un token filtrado no siga válido los 30 días de expiración.
    userApi.revokeSessions().catch(() => {});
    clearToken();
    setAuth({ status: "unauthenticated" });
  };

  const refreshUser = async () => {
    try {
      const user = await userApi.getMe();
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
  // El token llega en el fragmento (#token=...): no se envía al servidor ni
  // queda en logs/Referer. Soporta el query legado (?token=) por compatibilidad.
  const hash = window.location.hash.replace(/^#/, "");
  const token =
    new URLSearchParams(hash).get("token") ??
    new URLSearchParams(window.location.search).get("token");
  if (token) {
    setToken(token);
    window.history.replaceState({}, "", window.location.pathname);
  }
  return token;
}
