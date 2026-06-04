import { useQuery } from "@tanstack/react-query";
import { calendarApi } from "./api";
import { calendarKeys } from "./query-keys";

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
