import { useQuery } from "@tanstack/react-query";
import { dropsApi, dropKeys } from "@/features/drops";
import { useNow } from "@/lib/hooks/use-now";

export function formatDropTimeAgo(isoString: string, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(isoString).getTime());
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
  const now = useNow();
  const { data = null, isFetching, refetch } = useQuery({
    queryKey: dropKeys.last(),
    queryFn: dropsApi.getLast,
    staleTime: 30_000,
  });

  const timeAgo = data ? formatDropTimeAgo(data.logged_at, now) : null;

  return { data, timeAgo, isRefreshing: isFetching, refresh: refetch };
}
