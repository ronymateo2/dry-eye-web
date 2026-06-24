import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/features/user";
import {
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  type TodayWidgetConfig,
  type TodayWidgetId,
} from "./widget-config";

const STORAGE_KEY = "today-widget-config";

function readLocal(): TodayWidgetConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return reconcileWidgetConfig(stored ? JSON.parse(stored) : []);
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

function writeLocal(config: TodayWidgetConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useWidgetConfig() {
  const { auth } = useAuth();
  const [config, setConfig] = useState<TodayWidgetConfig>(() => readLocal());
  const hydrated = useRef(false);

  useEffect(() => {
    if (auth.status === "authenticated" && !hydrated.current) {
      hydrated.current = true;
      const merged = reconcileWidgetConfig(auth.user.today_widget_config ?? []);
      setConfig(merged);
      writeLocal(merged);
    }
  }, [auth]);

  const persist = useCallback(
    async (next: TodayWidgetConfig, previous: TodayWidgetConfig) => {
      setConfig(next);
      writeLocal(next);
      try {
        await userApi.updateMe({ todayWidgetConfig: next });
      } catch {
        setConfig(previous);
        writeLocal(previous);
        toast.error("No se pudo guardar el orden.");
      }
    },
    [],
  );

  const reorder = useCallback(
    (activeId: TodayWidgetId, overId: TodayWidgetId) => {
      if (activeId === overId) return;
      const from = config.findIndex((e) => e.id === activeId);
      const to = config.findIndex((e) => e.id === overId);
      if (from === -1 || to === -1) return;
      const next = [...config];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void persist(next, config);
    },
    [config, persist],
  );

  const toggleVisible = useCallback(
    (id: TodayWidgetId) => {
      const next = config.map((e) =>
        e.id === id ? { ...e, visible: !e.visible } : e,
      );
      void persist(next, config);
    },
    [config, persist],
  );

  const reset = useCallback(() => {
    void persist(DEFAULT_WIDGET_CONFIG, config);
  }, [config, persist]);

  return { config, reorder, toggleVisible, reset };
}
