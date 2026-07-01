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

const SYNC_DEBOUNCE_MS = 500;

export function useWidgetConfig() {
  const { auth } = useAuth();
  const [config, setConfig] = useState<TodayWidgetConfig>(() =>
    reconcileWidgetConfig(
      auth.status === "authenticated" ? (auth.user.today_widget_config ?? []) : [],
    ),
  );
  const synced = useRef<TodayWidgetConfig>(config);
  const pending = useRef<TodayWidgetConfig | null>(null);

  useEffect(() => {
    if (config === synced.current) return;
    pending.current = config;
    const timer = setTimeout(async () => {
      pending.current = null;
      try {
        await userApi.updateMe({ todayWidgetConfig: config });
        synced.current = config;
      } catch {
        // solo rollback si no hay un cambio más nuevo en cola
        if (pending.current === null) setConfig(synced.current);
        toast.error("No se pudo guardar el orden.");
      }
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [config]);

  useEffect(
    () => () => {
      if (pending.current) {
        userApi.updateMe({ todayWidgetConfig: pending.current }).catch(() => {});
      }
    },
    [],
  );

  const reorder = useCallback((activeId: TodayWidgetId, overId: TodayWidgetId) => {
    if (activeId === overId) return;
    setConfig((prev) => {
      const from = prev.findIndex((e) => e.id === activeId);
      const to = prev.findIndex((e) => e.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const toggleVisible = useCallback((id: TodayWidgetId) => {
    setConfig((prev) =>
      prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)),
    );
  }, []);

  const reset = useCallback(() => {
    setConfig(DEFAULT_WIDGET_CONFIG);
  }, []);

  return { config, reorder, toggleVisible, reset };
}
