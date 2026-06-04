import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sleepApi } from "./api";
import { invalidateSleepToday } from "./invalidation";

export function useSaveSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => sleepApi.save(body),
    onSuccess: () => invalidateSleepToday(qc),
  });
}
