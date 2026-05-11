import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PulseIcon, CaretRightIcon, GearIcon, TrashIcon } from "@phosphor-icons/react";
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
  const expiresAtMs = new Date(vial.started_at).getTime() + durationMs;
  const diffMs = expiresAtMs - now;
  const isExpired = diffMs <= 0;
  const isWarning = !isExpired && diffMs < 2 * 3_600_000;
  const barColor = isExpired ? "var(--pain-high)" : isWarning ? "var(--warning)" : "var(--accent)";

  let rightLabel: string;
  if (isExpired) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    rightLabel = h > 0 ? `vencido hace ${h}h ${m}m` : `vencido hace ${m}m`;
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    rightLabel = h > 0 ? `expira en ${h}h ${m}m` : `expira en ${m}m`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="group min-h-[44px] w-full overflow-hidden rounded-[9px]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isConfirming ? (
          <motion.div
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-1"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-4 w-[3px] shrink-0 rounded-full opacity-90 transition-[height,opacity] duration-[160ms] ease-out group-hover:h-5 group-hover:opacity-100"
                style={{ background: barColor }}
              />
              <span
                className="truncate text-[13px] font-medium capitalize leading-none"
                style={{ color: isExpired ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {vial.drop_type_name}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <span
                className="font-mono text-[11px] font-semibold tabular-nums"
                style={{ color: barColor }}
              >
                {rightLabel}
              </span>
              <button
                type="button"
                onClick={onConfirm}
                className="flex items-center justify-center w-7 h-7 rounded-full text-[var(--text-faint)] opacity-60 hover:opacity-100 hover:bg-[var(--surface-el)] active:bg-[var(--surface-el)] active:text-[var(--error)] transition-all duration-[160ms]"
                aria-label={`Descartar ${vial.drop_type_name}`}
              >
                <TrashIcon size={15} weight="regular" />
              </button>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-between gap-3 px-3 py-1 min-h-[44px]"
          >
            <span className="min-w-0 truncate text-[12px] font-medium text-[var(--error)]">
              ¿Descartar {vial.drop_type_name}?
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-el)]"
              >
                No
              </button>
              <button
                type="button"
                onClick={onDiscard}
                disabled={isPending}
                className="rounded-full bg-[var(--error)]/10 px-3 py-1.5 text-[12px] font-medium text-[var(--error)] transition-opacity hover:bg-[var(--error)]/20 disabled:opacity-50"
              >
                {isPending ? "…" : "Sí"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

  const handleConfirm = useCallback((id: string) => setConfirmingId((prev) => (prev === id ? null : id)), []);
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
