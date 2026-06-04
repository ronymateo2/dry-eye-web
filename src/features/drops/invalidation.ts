import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { dropKeys, dropTypeKeys, vialKeys } from "./query-keys";

// Calendar is not yet migrated to a feature; drop mutations affect today's
// calendar view, so we invalidate its flat keys here until it migrates.
const calendarKeys = {
  eventsToday: ["calendar/events/today"] as const,
  status: ["calendar/status"] as const,
};

export function invalidateDrops(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: dropKeys.all });
  void qc.invalidateQueries({ queryKey: vialKeys.all });
  void qc.invalidateQueries({ queryKey: calendarKeys.eventsToday });
}

export function invalidateDropTypes(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: dropTypeKeys.all });
  void qc.invalidateQueries({ queryKey: dropKeys.lastPerType() });
}

export function useInvalidateDrops(): (dropTypeId?: string) => void {
  const qc = useQueryClient();
  return () => invalidateDrops(qc);
}
