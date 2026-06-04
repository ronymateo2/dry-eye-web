import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInsApi } from "./api";
import { invalidateLastCheckIn } from "./invalidation";

export function useSaveCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => checkInsApi.save(body),
    onSuccess: () => invalidateLastCheckIn(qc),
  });
}
