import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { api } from "./api";

export type FontOption = "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded";

type FontContextType = { font: FontOption; setFont: (f: FontOption) => Promise<void> };

const FontContext = createContext<FontContextType | null>(null);

function normalizeFont(raw: string | null | undefined): FontOption {
  if (raw === "manrope" || raw === "sf-pro-rounded") return raw;
  return "atkinson-hyperlegible";
}

export function FontProvider({ children }: { children: ReactNode }) {
  const { auth, refreshUser } = useAuth();
  const serverFont: FontOption =
    auth.status === "authenticated"
      ? normalizeFont(auth.user.font)
      : "atkinson-hyperlegible";

  const [font, setLocalFont] = useState<FontOption>(() => {
    const stored = localStorage.getItem("weqe_font") as FontOption | null;
    return normalizeFont(stored ?? "atkinson-hyperlegible");
  });

  useEffect(() => {
    if (auth.status !== "loading") setLocalFont(serverFont);
  }, [serverFont, auth.status]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", font);
    localStorage.setItem("weqe_font", font);
  }, [font]);

  const setFont = async (f: FontOption) => {
    const previous = font;
    setLocalFont(f);
    localStorage.setItem("weqe_font", f);
    try {
      await api.updateMe({ font: f });
      await refreshUser();
    } catch {
      setLocalFont(previous);
      localStorage.setItem("weqe_font", previous);
      throw new Error("No se pudo cambiar la fuente.");
    }
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont(): FontContextType {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error("useFont must be used within FontProvider");
  return ctx;
}
