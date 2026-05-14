import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DoseSlot } from "@/components/register/day-projection-sheet";
import { api } from "@/lib/api";
import { daysUntilEnd } from "@/lib/utils";
import { getNextMs, isPrevDayOverdue, isCompletedToday, buildDayProjection } from "./helpers";

export function useScheduleData() {
  const [now, setNow] = useState(() => Date.now());

  const { data: activeVials = [] } = useQuery({
    queryKey: ["vials/active"],
    queryFn: api.getActiveVials,
    staleTime: 60_000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["drops/last-per-type"],
    queryFn: api.getLastDropPerType,
    staleTime: 60_000,
  });

  const { data: calendarData } = useQuery({
    queryKey: ["calendar/events/today"],
    queryFn: api.getCalendarEventsToday,
    staleTime: 60_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const validEntries = useMemo(
    () =>
      entries
        .filter((e) => e.interval_hours != null)
        .filter((e) => !(e.end_date && daysUntilEnd(e.end_date) < 0)),
    [entries],
  );

  const upcoming = useMemo(
    () =>
      validEntries
        .filter((e) => !isPrevDayOverdue(e, now) && !isCompletedToday(e, now))
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [validEntries, now],
  );

  const completado = useMemo(
    () => validEntries.filter((e) => isCompletedToday(e, now)),
    [validEntries, now],
  );

  const sinRegistro = useMemo(
    () => validEntries.filter((e) => isPrevDayOverdue(e, now) || !e.last_logged_at),
    [validEntries, now],
  );

  const daySlots = useMemo<DoseSlot[]>(() => {
    const calEvents = calendarData?.events;
    if (calEvents && calEvents.length > 0) {
      return calEvents
        .map((e) => ({
          time: new Date(e.scheduled_at).getTime(),
          name: e.name,
          drop_type_id: e.drop_type_id,
        }))
        .sort((a, b) => a.time - b.time);
    }
    return buildDayProjection(entries);
  }, [calendarData, entries]);

  const vialByDropType = useMemo(
    () => new Map(activeVials.map((v) => [v.drop_type_id, v])),
    [activeVials],
  );

  return { now, activeVials, upcoming, completado, sinRegistro, daySlots, vialByDropType };
}
