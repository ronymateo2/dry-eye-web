import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { dropKeys, dropTypeKeys, vialKeys } from "@/features/drops";
import { calendarKeys } from "@/features/calendar";
import { medicationKeys } from "@/features/medications";
import { symptomKeys } from "@/features/symptoms";
import { sleepKeys } from "@/features/sleep";
import { checkInKeys } from "@/features/check-ins";
import { todayApi } from "./api";
import { todayKeys } from "./query-keys";
import type { TodayBundle } from "./types";

function seedCaches(qc: QueryClient, bundle: TodayBundle) {
  const seed = (key: readonly unknown[], val: unknown) => {
    if (qc.getQueryData(key) === undefined) qc.setQueryData(key, val);
  };
  seed(checkInKeys.last(), bundle.checkInLast);
  seed(sleepKeys.today(), bundle.sleepToday);
  seed(dropKeys.lastPerType(), bundle.dropsLastPerType);
  seed(calendarKeys.eventsToday(), bundle.calendarEventsToday);
  seed(medicationKeys.list(), bundle.medications);
  seed(medicationKeys.intakesToday(), bundle.medicationIntakesToday);
  seed(medicationKeys.intakesLastPerMed(), bundle.medicationIntakesLastPerMed);
  seed(vialKeys.active(), bundle.vialsActive);
  seed(symptomKeys.today(), bundle.symptomsToday);
  seed(dropTypeKeys.list(), bundle.dropTypes);
  seed(dropKeys.today(), bundle.dropsToday);
}

export function useTodayBundle() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: todayKeys.all,
    queryFn: async () => {
      const bundle = await todayApi.getBundle();
      seedCaches(queryClient, bundle);
      return bundle;
    },
    staleTime: Infinity,
  });
}
