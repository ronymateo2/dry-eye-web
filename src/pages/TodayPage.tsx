import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { GearIcon, CaretRightIcon } from "@phosphor-icons/react";
import { MedicationsAgenda } from "@/components/today/medications-agenda";
import { SymptomStatusCard } from "@/components/today/symptom-status-card";
import { SleepStatus } from "@/components/ui/sleep-status";
import { CardView } from "@/components/today/card-view";
import { HeroView } from "@/components/today/hero-view";
import { PainCheckInCompact } from "@/components/today/pain-check-in-compact";
import { useScheduleData } from "@/components/today/use-schedule-data";
import { dispatchQuickAction } from "@/components/today/helpers";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";

const openSymptomsSheet = () => dispatchQuickAction("symptoms");

export default function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useLocalStorage<"card" | "hero">("schedule-view", "hero");

  const scheduleData = useScheduleData();

  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: ["check-ins/last"], queryFn: api.getLastCheckIn, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["sleep/today"], queryFn: api.getTodaySleep, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["drops/last-per-type"], queryFn: api.getLastDropPerType, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["calendar/events/today"], queryFn: api.getCalendarEventsToday, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["medications"], queryFn: api.getMedications, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["medication-intakes/last-per-med"], queryFn: api.getLastIntakePerMedication, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["vials/active"], queryFn: api.getActiveVials, staleTime: 60_000 });
    void queryClient.prefetchQuery({ queryKey: ["symptoms/today"], queryFn: api.getSymptomStatusToday, staleTime: 60_000 });
  }, [queryClient]);

  const { scheduled } = scheduleData;

  return (
    <section className="space-y-5">
      <SymptomStatusCard onRegister={openSymptomsSheet} />

      {view === "card" || scheduled.length === 0 ? (
        <CardView data={scheduleData} view={view} setView={setView} />
      ) : (
        <HeroView data={scheduleData} view={view} setView={setView} />
      )}

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
        <MedicationsAgenda />
      </div>

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
