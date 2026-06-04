import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SaveMedicationInput, SaveMedicationIntakeInput } from "@/types/domain";
import { medicationsApi } from "./api";
import { invalidateMedications, invalidateMedicationIntakes } from "./invalidation";

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveMedicationInput) => medicationsApi.create(body),
    onSuccess: () => invalidateMedications(qc),
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SaveMedicationInput }) =>
      medicationsApi.update(id, body),
    onSuccess: () => invalidateMedications(qc),
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.remove(id),
    onSuccess: () => invalidateMedications(qc),
  });
}

export function useReorderMedications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => medicationsApi.reorder(ids),
    onSuccess: () => invalidateMedications(qc),
  });
}

export function useSaveMedicationIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveMedicationIntakeInput) => medicationsApi.saveIntake(body),
    onSuccess: () => invalidateMedicationIntakes(qc),
  });
}

export function useDeleteMedicationIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteIntake(id),
    onSuccess: () => invalidateMedicationIntakes(qc),
  });
}
