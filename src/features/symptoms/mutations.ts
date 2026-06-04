import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SaveSymptomEntryInput } from "@/types/domain";
import { symptomsApi } from "./api";
import { invalidateSymptomsToday } from "./invalidation";

export function useSaveSymptomEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveSymptomEntryInput) => symptomsApi.saveEntry(body),
    onSuccess: () => invalidateSymptomsToday(qc),
  });
}
