import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
import { dropKeys, dropTypeKeys, vialKeys } from "@/features/drops";
import { calendarKeys } from "@/features/calendar";
import { medicationKeys } from "@/features/medications";
import { symptomKeys } from "@/features/symptoms";
import { sleepKeys } from "@/features/sleep";
import { checkInKeys } from "@/features/check-ins";
import { todayApi, todayKeys, type TodayBundle } from "@/features/today";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

const openSymptomsSheet = () => dispatchQuickAction("symptoms");

function seedTodayCaches(qc: QueryClient, bundle: TodayBundle) {
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

function TodaySkeleton() {
  return (
    <section className="space-y-5" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]"
        />
      ))}
    </section>
  );
}

function ScheduleSection() {
  const [view, setView] = useLocalStorage<"card" | "hero">("schedule-view", "hero");
  const scheduleData = useScheduleData();

  return view === "card" ? (
    <CardView data={scheduleData} view={view} setView={setView} />
  ) : (
    <HeroView data={scheduleData} view={view} setView={setView} />
  );
}

function TodayContent() {
  const navigate = useNavigate();

  return (
    <section className="space-y-5">
      <SymptomStatusCard onRegister={openSymptomsSheet} />

      <ScheduleSection />

      <OnDemandDrops />

      <MedicationsAgenda />

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

export default function TodayPage() {
  const queryClient = useQueryClient();

  const { isPending } = useQuery({
    queryKey: todayKeys.all,
    queryFn: async () => {
      const bundle = await todayApi.getBundle();
      seedTodayCaches(queryClient, bundle);
      return bundle;
    },
    staleTime: 30_000,
  });

  if (isPending) return <TodaySkeleton />;
  return <TodayContent />;
}
