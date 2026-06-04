import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { calendarKeys } from "@/features/calendar";
import { dropKeys, dropTypeKeys, vialKeys } from "./query-keys";

export function invalidateDrops(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: dropKeys.all });
  void qc.invalidateQueries({ queryKey: vialKeys.all });
  void qc.invalidateQueries({ queryKey: calendarKeys.eventsToday() });
}

export function invalidateDropTypes(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: dropTypeKeys.all });
  void qc.invalidateQueries({ queryKey: dropKeys.lastPerType() });
}

export function useInvalidateDrops(): (dropTypeId?: string) => void {
  const qc = useQueryClient();
  return () => invalidateDrops(qc);
}
