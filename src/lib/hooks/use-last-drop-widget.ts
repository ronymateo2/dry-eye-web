import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  const [, setTick] = useState(0);
  const { data = null, isFetching, refetch } = useQuery({
    queryKey: ["drops/last"],
    queryFn: api.getLastDrop,
    staleTime: 30_000,
  });

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const timeAgo = data ? formatDropTimeAgo(data.logged_at) : null;

  return { data, timeAgo, isRefreshing: isFetching, refresh: refetch };
}
