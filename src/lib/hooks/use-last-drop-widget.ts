import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import {
  getLastDropSnapshot,
  setLastDrop,
  subscribeLastDrop,
} from "@/lib/last-drop-store";

export function formatDropTimeAgo(isoString: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(isoString).getTime());
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 1) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `hace ${diffHr}h ${remMin}m` : `hace ${diffHr}h`;
  }
  return diffDays === 1 ? "hace 1 día" : `hace ${diffDays} días`;
}

export function useLastDropWidget() {
  const data = useSyncExternalStore(subscribeLastDrop, getLastDropSnapshot);
  const [, setTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") setTick((t) => t + 1); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await api.getLastDrop();
      setLastDrop(result);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current && !data) {
      hasFetched.current = true;
      refresh();
    } else {
      hasFetched.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timeAgo = data ? formatDropTimeAgo(data.logged_at) : null;

  return { data, timeAgo, isRefreshing, refresh };
}
