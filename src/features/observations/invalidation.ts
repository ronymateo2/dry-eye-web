import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { observationKeys } from "./query-keys";

export function invalidateObservations(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: observationKeys.all });
}

export function useInvalidateObservations(): () => void {
  const qc = useQueryClient();
  return () => invalidateObservations(qc);
}
