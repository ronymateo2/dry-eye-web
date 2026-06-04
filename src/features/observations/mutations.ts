import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SaveOccurrenceInput } from "@/types/domain";
import { observationsApi } from "./api";
import type { ObservationBody } from "./types";
import { invalidateObservations } from "./invalidation";

export function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ObservationBody) => observationsApi.create(body),
    onSuccess: () => invalidateObservations(qc),
  });
}

export function useUpdateObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ObservationBody> }) =>
      observationsApi.update(id, body),
    onSuccess: () => invalidateObservations(qc),
  });
}

export function useDeleteObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => observationsApi.remove(id),
    onSuccess: () => invalidateObservations(qc),
  });
}

export function useSaveOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ observationId, body }: { observationId: string; body: Omit<SaveOccurrenceInput, "observationId"> }) =>
      observationsApi.saveOccurrence(observationId, body),
    onSuccess: () => invalidateObservations(qc),
  });
}

export function useDeleteOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ observationId, occurrenceId }: { observationId: string; occurrenceId: string }) =>
      observationsApi.deleteOccurrence(observationId, occurrenceId),
    onSuccess: () => invalidateObservations(qc),
  });
}
