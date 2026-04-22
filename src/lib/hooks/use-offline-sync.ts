import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getPendingDrops, removePendingDrop } from "@/lib/offline/drops-queue";

export function useOfflineSync() {
  const queryClient = useQueryClient();

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    const pending = await getPendingDrops();
    if (pending.length === 0) return;

    for (const drop of pending) {
      try {
        await api.saveDrop(drop);
        await removePendingDrop(drop.id);
      } catch {
        // keep in queue, try next time
      }
    }

    queryClient.invalidateQueries({ queryKey: ["drops/last"] });
  }, [queryClient]);

  useEffect(() => {
    const onOnline = () => sync();
    window.addEventListener("online", onOnline);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);
}
