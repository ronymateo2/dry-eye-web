import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useAuth } from "./auth";
import { api } from "./api";

type Theme = "dark" | "light";
type ThemeContextType = { theme: Theme; setTheme: (t: Theme) => Promise<void> };

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { auth, refreshUser } = useAuth();
  const theme: Theme =
    auth.status === "authenticated" ? (auth.user.theme ?? "dark") : "dark";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = async (t: Theme) => {
    await api.updateMe({ theme: t });
    await refreshUser();
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
