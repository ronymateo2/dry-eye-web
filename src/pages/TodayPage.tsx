import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PulseIcon, CaretRightIcon, GearIcon, XCircleIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
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

function VialRow({
  vial,
  index,
  now,
  isConfirming,
  onConfirm,
  onCancel,
  onDiscard,
  isPending,
}: {
  vial: { id: string; drop_type_name: string; started_at: string; vial_duration?: number | null };
  index: number;
  now: number;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDiscard: () => void;
  isPending: boolean;
}) {
  const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
  const expiresAt = new Date(new Date(vial.started_at).getTime() + durationMs).toISOString();
  const remainingText = formatVialCountdown(expiresAt);
  const isExpired = remainingText === "Vencido";
  const isWarning = !isExpired && new Date(expiresAt).getTime() - now < 2 * 3_600_000;
  const barColor = isExpired ? "var(--pain-high)" : isWarning ? "var(--warning)" : "var(--accent)";
  const countdownLabel = isExpired ? "Vencido" : remainingText;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "group grid min-h-[34px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-1 py-1 text-left",
          "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
          "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-4 w-[3px] shrink-0 rounded-full opacity-90 transition-[height,opacity] duration-[160ms] ease-out group-hover:h-5 group-hover:opacity-100"
            style={{ background: barColor }}
          />
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span
              className={cn(
                "truncate text-[13px] font-medium capitalize leading-none",
                isExpired ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
              )}
            >
              {vial.drop_type_name}
            </span>
            <span className="shrink-0 text-[11px] leading-none text-[var(--text-faint)]">·</span>
            <span className="truncate font-mono text-[11px] leading-none tabular-nums text-[var(--text-faint)]">
              {isExpired ? "Vencido" : `expira en ${remainingText}`}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className="font-mono text-[11px] font-semibold tabular-nums transition-transform duration-[160ms] ease-out group-hover:-translate-x-0.5"
            style={{ color: barColor, transition: "color 0.4s ease, transform 160ms ease-out" }}
          >
            {countdownLabel}
          </span>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center justify-center w-12 h-12 -m-3 rounded-full text-[var(--text-faint)] opacity-50 active:opacity-100 active:bg-[var(--surface-el)] active:text-[var(--error)] transition-all duration-[160ms]"
            aria-label={`Descartar ${vial.drop_type_name}`}
          >
            <XCircleIcon size={16} weight="regular" />
          </button>
        </span>
      </motion.div>

      <AnimatePresence initial={false}>
        {isConfirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-1 pt-1 pb-1">
              <div className="flex items-center justify-between gap-3 rounded-[9px] border border-[var(--error)]/20 bg-[var(--error)]/[0.04] px-3 py-2">
                <span className="text-[12px] font-medium text-[var(--error)]">¿Descartar {vial.drop_type_name}?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)]"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isPending}
                    className="rounded-full px-3 py-1 text-[12px] font-medium text-[var(--error)] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "..." : "Descartar"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActiveVialsSection() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { data: activeVials = [] } = useQuery({
    queryKey: ["vials/active"],
    queryFn: api.getActiveVials,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const discardMutation = useMutation({
    mutationFn: (id: string) => api.discardVial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vials/active"] });
      setConfirmingId(null);
    },
  });

  const handleConfirm = useCallback((id: string) => setConfirmingId(id), []);
  const handleCancel = useCallback(() => setConfirmingId(null), []);

  if (activeVials.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4">
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Viales activos</p>
        </div>
        <div className="space-y-0">
          <AnimatePresence initial={false}>
            {activeVials.map((vial, i) => (
              <VialRow
                key={vial.id}
                vial={vial}
                index={i}
                now={now}
                isConfirming={confirmingId === vial.id}
                onConfirm={() => handleConfirm(vial.id)}
                onCancel={handleCancel}
                onDiscard={() => discardMutation.mutate(vial.id)}
                isPending={discardMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
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
