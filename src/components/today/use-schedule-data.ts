import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dropsApi, dropKeys, vialKeys } from "@/features/drops";
import { daysUntilEnd } from "@/lib/utils";
import { getNextMs, isLoggedToday, isCompletedToday } from "./helpers";

export function useScheduleData(now: number) {
  const { data: activeVials = [] } = useQuery({
    queryKey: vialKeys.active(),
    queryFn: dropsApi.getActiveVials,
    staleTime: 60_000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: dropKeys.lastPerType(),
    queryFn: dropsApi.getLastPerType,
    staleTime: 60_000,
  });

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
        .filter((e) => isLoggedToday(e, now) && !isCompletedToday(e, now))
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [validEntries, now],
  );

  const completado = useMemo(
    () => validEntries.filter((e) => isCompletedToday(e, now)),
    [validEntries, now],
  );

  const sinRegistro = useMemo(
    () => validEntries.filter((e) => !isLoggedToday(e, now) && !isCompletedToday(e, now)),
    [validEntries, now],
  );

  const vialByDropType = useMemo(
    () => new Map(activeVials.map((v) => [v.drop_type_id, v])),
    [activeVials],
  );

  const { data: todayDrops = [] } = useQuery({
    queryKey: dropKeys.today(),
    queryFn: dropsApi.getToday,
    staleTime: 30_000,
  });

  const todayCount = todayDrops.length;

  return { now, activeVials, upcoming, completado, sinRegistro, vialByDropType, todayCount };
}
