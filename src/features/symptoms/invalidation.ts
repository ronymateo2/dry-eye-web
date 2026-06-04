import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { symptomKeys } from "./query-keys";

export function invalidateSymptomsToday(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: symptomKeys.today() });
}

export function useInvalidateSymptoms(): () => void {
  const qc = useQueryClient();
  return () => invalidateSymptomsToday(qc);
}
