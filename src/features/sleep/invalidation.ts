import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { sleepKeys } from "./query-keys";

export function invalidateSleepToday(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: sleepKeys.today() });
}

export function useInvalidateSleep(): () => void {
  const qc = useQueryClient();
  return () => invalidateSleepToday(qc);
}
