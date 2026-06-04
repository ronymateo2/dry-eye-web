import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { CalendarStatus, CalendarEventEntry } from "@/types/domain";

export const calendarKeys = {
  all: ["calendar"] as const,
  eventsToday: () => [...calendarKeys.all, "events-today"] as const,
  status: () => [...calendarKeys.all, "status"] as const,
};

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

export function useCalendarEventsToday() {
  return useQuery({
    queryKey: calendarKeys.eventsToday(),
    queryFn: calendarApi.getEventsToday,
    staleTime: 60_000,
  });
}

export function useCalendarStatus() {
  return useQuery({ queryKey: calendarKeys.status(), queryFn: calendarApi.getStatus });
}
