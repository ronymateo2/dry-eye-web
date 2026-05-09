import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PulseIcon, CaretRightIcon, GearIcon, EyedropperSampleIcon, TimerIcon, XCircleIcon } from "@phosphor-icons/react";
import { DropsScheduleCard } from "@/components/register/drops-schedule-card";
import { MedicationsAgenda } from "@/components/today/medications-agenda";
import { SleepStatus } from "@/components/ui/sleep-status";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays > 0) return `hace ${diffDays}d`;
  if (diffHr > 0) return `hace ${diffHr}h`;
  if (diffMin > 0) return `hace ${diffMin}m`;
  return "ahora";
}

function formatVialCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "Vencido";
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function ActiveVialsSection() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data: activeVials = [] } = useQuery({
    queryKey: ["vials/active"],
    queryFn: api.getActiveVials,
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => api.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      setConfirmingId(null);
    },
  });

  if (activeVials.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-faint)]">Viales activos</p>
      {activeVials.map((vial) => {
        const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
        const expiresAt = new Date(new Date(vial.started_at).getTime() + durationMs).toISOString();
        const remainingText = formatVialCountdown(expiresAt);
        const isExpired = remainingText === "Vencido";
        const isWarning = !isExpired && new Date(expiresAt).getTime() - Date.now() < 2 * 3_600_000;
        const isConfirming = confirmingId === vial.id;

        return (
          <div
            key={vial.id}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <EyedropperSampleIcon size={16} className="shrink-0 text-[var(--accent)]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{vial.drop_type_name}</p>
                  <div className="flex items-center gap-1.5">
                    <TimerIcon size={12} className={isExpired ? "text-[var(--pain-high)]" : isWarning ? "text-[var(--warning)]" : "text-[var(--accent)]"} />
                    <span className={`text-[12px] font-[family-name:var(--font-mono)] ${isExpired ? "text-[var(--pain-high)]" : isWarning ? "text-[var(--warning)]" : "text-[var(--accent)]"}`}>
                      {isExpired ? "Vencido" : `Expira en ${remainingText}`}
                    </span>
                  </div>
                </div>
              </div>
              {!isConfirming && (
                <button
                  type="button"
                  onClick={() => setConfirmingId(vial.id)}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
                >
                  <XCircleIcon size={12} />
                  Descartar
                </button>
              )}
            </div>
            {isConfirming && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[8px] border border-[var(--error)]/20 bg-[var(--error)]/[0.04] px-2.5 py-2">
                <span className="text-[12px] font-medium text-[var(--error)]">¿Descartar vial?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => discardMutation.mutate(vial.id)}
                    disabled={discardMutation.isPending}
                    className="rounded-full px-3 py-1 text-[12px] font-medium text-[var(--error)] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    {discardMutation.isPending ? "..." : "Sí, descartar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PainCheckInCompact() {
  const navigate = useNavigate();
  const { data: lastCheckIn } = useQuery({
    queryKey: ["check-ins/last"],
    queryFn: api.getLastCheckIn,
    staleTime: 60_000,
  });

  const lastAgo = timeAgo(lastCheckIn?.logged_at ?? null);

  const label = lastAgo ? `Dolor · ${lastAgo}` : "Dolor";

  return (
    <button
      type="button"
      onClick={() => navigate("/check-in")}
      className={cn(
        "flex min-h-[48px] w-full items-center gap-3 rounded-[9px] px-2 py-1.5 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
      )}
      aria-label="Registrar dolor"
    >
      <PulseIcon size={16} className="shrink-0 text-[var(--text-muted)]" />
      <span className={cn("text-[13px]", lastAgo ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]")}>
        {label}
      </span>
      <CaretRightIcon size={10} className="ml-auto shrink-0 text-[var(--text-faint)]" />
    </button>
  );
}

export default function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["check-ins/last"],
      queryFn: api.getLastCheckIn,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["sleep/today"],
      queryFn: api.getTodaySleep,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["drops/last-per-type"],
      queryFn: api.getLastDropPerType,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["calendar/events/today"],
      queryFn: api.getCalendarEventsToday,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["medications"],
      queryFn: api.getMedications,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["medication-intakes/last-per-med"],
      queryFn: api.getLastIntakePerMedication,
      staleTime: 60_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ["vials/active"],
      queryFn: api.getActiveVials,
      staleTime: 60_000,
    });
  }, [queryClient]);

  return (
    <section className="space-y-5">
      <ActiveVialsSection />

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
        <DropsScheduleCard />
      </div>
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
            "text-[13px] text-[var(--text-muted)]",
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
