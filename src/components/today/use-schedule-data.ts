import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dropsApi, dropKeys, vialKeys } from "@/features/drops";
import { daysUntilEnd } from "@/lib/utils";
import { getNextMs, isLoggedToday, isCompletedToday } from "./helpers";

export function useScheduleData() {
  const { data: activeVials = [] } = useQuery({
    queryKey: vialKeys.active(),
    queryFn: dropsApi.getActiveVials,
    staleTime: 60_000,
  });

  const { data: entries = [], dataUpdatedAt: entriesUpdatedAt } = useQuery({
    queryKey: dropKeys.lastPerType(),
    queryFn: dropsApi.getLastPerType,
    staleTime: 60_000,
  });

  const { data: todayDrops = [], dataUpdatedAt: todayUpdatedAt } = useQuery({
    queryKey: dropKeys.today(),
    queryFn: dropsApi.getToday,
    staleTime: 30_000,
  });

  // anchor = last fetch time: stand-in for "now" that only moves on data
  // refresh. Bucket membership only flips at a day boundary or on a log, so a
  // few-minutes-stale anchor is exact and keeps this hook quiet between ticks.
  // The live countdown is owned by leaf components via useNow().
  const anchor = Math.max(entriesUpdatedAt, todayUpdatedAt);

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
        .filter((e) => isLoggedToday(e, anchor) && !isCompletedToday(e, anchor))
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [validEntries, anchor],
  );

  const completado = useMemo(
    () => validEntries.filter((e) => isCompletedToday(e, anchor)),
    [validEntries, anchor],
  );

  const sinRegistro = useMemo(
    () => validEntries.filter((e) => !isLoggedToday(e, anchor) && !isCompletedToday(e, anchor)),
    [validEntries, anchor],
  );

  const vialByDropType = useMemo(
    () => new Map(activeVials.map((v) => [v.drop_type_id, v])),
    [activeVials],
  );

  const todayCount = todayDrops.length;

  return { activeVials, upcoming, completado, sinRegistro, vialByDropType, todayCount };
}
