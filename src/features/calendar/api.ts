import { http } from "@/lib/http";
import type { CalendarStatus, CalendarEventEntry } from "@/types/domain";

export const calendarApi = {
  getEventsToday: () => http.get<{ events: CalendarEventEntry[] }>("/calendar/events/today"),
  getStatus: () => http.get<CalendarStatus>("/calendar/status"),
  syncDay: (dropTypeId: string, dayKey: string, fromLoggedAt: string) =>
    http.post<{ ok: boolean; events_created?: number; skipped?: boolean; reason?: string }>(
      "/calendar/sync-day",
      { dropTypeId, dayKey, fromLoggedAt },
    ),
  reprocessDay: (dropTypeId: string, dayKey: string) =>
    http.post<{ ok: boolean; skipped?: boolean; reason?: string }>("/calendar/reprocess", {
      dropTypeId,
      dayKey,
    }),
};
