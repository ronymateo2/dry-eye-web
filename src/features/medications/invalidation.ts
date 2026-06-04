import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { medicationKeys } from "./query-keys";

export function invalidateMedications(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: medicationKeys.all });
}

export function invalidateMedicationIntakes(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: medicationKeys.intakesToday() });
  void qc.invalidateQueries({ queryKey: medicationKeys.intakesLastPerMed() });
}

export function useInvalidateMedications(): () => void {
  const qc = useQueryClient();
  return () => invalidateMedications(qc);
}
