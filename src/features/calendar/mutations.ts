import { useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "./api";
import { invalidateCalendar } from "./invalidation";

export function useSyncCalendarDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dropTypeId, dayKey, fromLoggedAt }: { dropTypeId: string; dayKey: string; fromLoggedAt: string }) =>
      calendarApi.syncDay(dropTypeId, dayKey, fromLoggedAt),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useReprocessCalendarDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dropTypeId, dayKey }: { dropTypeId: string; dayKey: string }) =>
      calendarApi.reprocessDay(dropTypeId, dayKey),
    onSuccess: () => invalidateCalendar(qc),
  });
}
