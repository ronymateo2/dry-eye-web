import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { GearIcon, CaretRightIcon } from "@phosphor-icons/react";
import { MedicationsAgenda } from "@/components/today/medications-agenda";
import { OnDemandDrops } from "@/components/today/on-demand-drops";
import { SymptomStatusCard } from "@/components/today/symptom-status-card";
import { SleepStatus } from "@/components/ui/sleep-status";
import { CardView } from "@/components/today/card-view";
import { HeroView } from "@/components/today/hero-view";
import { PainCheckInCompact } from "@/components/today/pain-check-in-compact";
import { useScheduleData } from "@/components/today/use-schedule-data";
import { dispatchQuickAction } from "@/components/today/helpers";
import { dropsApi, dropKeys, vialKeys } from "@/features/drops";
import { calendarApi, calendarKeys } from "@/features/calendar";
import { medicationsApi, medicationKeys } from "@/features/medications";
import { symptomsApi, symptomKeys } from "@/features/symptoms";
import { sleepApi, sleepKeys } from "@/features/sleep";
import { checkInsApi, checkInKeys } from "@/features/check-ins";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useNow } from "@/lib/hooks/use-now";

const openSymptomsSheet = () => dispatchQuickAction("symptoms");

export default function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useLocalStorage<"card" | "hero">("schedule-view", "hero");

  const now = useNow(30_000);
  const scheduleData = useScheduleData(now);

  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: checkInKeys.last(), queryFn: checkInsApi.getLast, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: sleepKeys.today(), queryFn: sleepApi.getToday, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: dropKeys.lastPerType(), queryFn: dropsApi.getLastPerType, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: calendarKeys.eventsToday(), queryFn: calendarApi.getEventsToday, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: medicationKeys.list(), queryFn: medicationsApi.getList, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: medicationKeys.intakesLastPerMed(), queryFn: medicationsApi.getLastIntakePerMed, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: medicationKeys.intakesToday(), queryFn: medicationsApi.getTodayIntakes, staleTime: 30_000 });
    void queryClient.prefetchQuery({ queryKey: vialKeys.active(), queryFn: dropsApi.getActiveVials, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: symptomKeys.today(), queryFn: symptomsApi.getStatusToday, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: dropKeys.recentAll(), queryFn: () => dropsApi.getRecentAll(24), staleTime: 30_000 });
  }, [queryClient]);

  return (
    <section className="space-y-5">
      <SymptomStatusCard onRegister={openSymptomsSheet} />

      {view === "card" ? (
        <CardView data={scheduleData} view={view} setView={setView} />
      ) : (
        <HeroView data={scheduleData} view={view} setView={setView} />
      )}

      <OnDemandDrops />

      <MedicationsAgenda now={now} />

      <div className="space-y-0.5 pt-1">
        <PainCheckInCompact />
        <SleepStatus />
        <button
          type="button"
          onClick={() => navigate("/treatments")}
          className={cn(
            "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
            "text-[15px] text-[var(--text-muted)]",
            "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
            "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
          )}
          aria-label="Gestionar tratamientos"
        >
          <GearIcon size={16} className="shrink-0" />
          Gestionar tratamientos
          <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
        </button>
      </div>
    </section>
  );
}
