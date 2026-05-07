import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { api } from "./api";

type Theme = "dark" | "light";
type ThemeContextType = { theme: Theme; setTheme: (t: Theme) => Promise<void> };

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { auth, refreshUser } = useAuth();
  const serverTheme: Theme =
    auth.status === "authenticated" ? (auth.user.theme ?? "dark") : "dark";

  const [theme, setLocalTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("weqe_theme") as Theme | null;
    return stored ?? "dark";
  });

  useEffect(() => {
    if (auth.status !== "loading") setLocalTheme(serverTheme);
  }, [serverTheme, auth.status]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("weqe_theme", theme);
  }, [theme]);

  const setTheme = async (t: Theme) => {
    const previous = theme;
    setLocalTheme(t);
    localStorage.setItem("weqe_theme", t);
    try {
      await api.updateMe({ theme: t });
      await refreshUser();
    } catch {
      setLocalTheme(previous);
      localStorage.setItem("weqe_theme", previous);
      throw new Error("No se pudo cambiar el tema.");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
