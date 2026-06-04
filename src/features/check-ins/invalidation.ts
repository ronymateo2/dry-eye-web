import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { checkInKeys } from "./query-keys";

export function invalidateLastCheckIn(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: checkInKeys.last() });
}

export function useInvalidateCheckIns(): () => void {
  const qc = useQueryClient();
  return () => invalidateLastCheckIn(qc);
}
