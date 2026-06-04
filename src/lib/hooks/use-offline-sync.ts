import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { dropsApi, dropKeys } from "@/features/drops";
import { symptomsApi, symptomKeys } from "@/features/symptoms";
import { getPendingDrops, removePendingDrop } from "@/lib/offline/drops-queue";
import { getPendingSymptomEntries, removePendingSymptomEntry } from "@/lib/offline/symptoms-queue";

export function useOfflineSync() {
  const queryClient = useQueryClient();

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingDrops = await getPendingDrops();
    for (const drop of pendingDrops) {
      try {
        await dropsApi.save(drop);
        await removePendingDrop(drop.id);
      } catch {
        // keep in queue
      }
    }
    if (pendingDrops.length > 0) {
      queryClient.invalidateQueries({ queryKey: dropKeys.last() });
      queryClient.invalidateQueries({ queryKey: dropKeys.lastPerType() });
    }

    const pendingSymptoms = await getPendingSymptomEntries();
    for (const entry of pendingSymptoms) {
      try {
        await symptomsApi.saveEntry(entry);
        await removePendingSymptomEntry(entry.id);
      } catch {
        // keep in queue
      }
    }
    if (pendingSymptoms.length > 0) {
      queryClient.invalidateQueries({ queryKey: symptomKeys.today() });
    }
  }, [queryClient]);

  useEffect(() => {
    const onOnline = () => sync();
    window.addEventListener("online", onOnline);
    if (navigator.onLine) sync();
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);
}
