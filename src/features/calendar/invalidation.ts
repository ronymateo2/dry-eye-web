import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { calendarKeys } from "./query-keys";

export function invalidateCalendar(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: calendarKeys.all });
}

export function useInvalidateCalendar(): () => void {
  const qc = useQueryClient();
  return () => invalidateCalendar(qc);
}
