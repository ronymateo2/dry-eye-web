import { useMemo } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import {
  DEFAULT_WIDGET_CONFIG,
  reconcileWidgetConfig,
  type TodayWidgetConfig,
  type TodayWidgetId,
} from "./widget-registry";

const STORAGE_KEY = "today-widget-config";

export function useWidgetConfig() {
  const [raw, setRaw] = useLocalStorage<TodayWidgetConfig>(STORAGE_KEY, DEFAULT_WIDGET_CONFIG);

  const config = useMemo(() => reconcileWidgetConfig(raw), [raw]);

  const reorder = (activeId: TodayWidgetId, overId: TodayWidgetId) => {
    if (activeId === overId) return;
    const from = config.findIndex((e) => e.id === activeId);
    const to = config.findIndex((e) => e.id === overId);
    if (from === -1 || to === -1) return;
    const next = [...config];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRaw(next);
  };

  const toggleVisible = (id: TodayWidgetId) => {
    setRaw(config.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));
  };

  const reset = () => setRaw(DEFAULT_WIDGET_CONFIG);

  return { config, reorder, toggleVisible, reset };
}
