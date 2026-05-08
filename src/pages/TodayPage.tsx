import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  DropIcon,
  PillIcon,
  EyeIcon,
  MoonIcon,
  PulseIcon,
  CaretRightIcon,
  GearIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { DropsScheduleCard } from "@/components/register/drops-schedule-card";
import { MedicationsAgenda } from "@/components/today/medications-agenda";
import { SleepNudge } from "@/components/ui/sleep-nudge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STAGGER_DELAY = 0.06;
const CARD_EASE = [0.23, 1, 0.32, 1] as const;

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

function PainCheckInCard({ index }: { index: number }) {
  const navigate = useNavigate();
  const { data: lastCheckIn } = useQuery({
    queryKey: ["check-ins/last"],
    queryFn: api.getLastCheckIn,
    staleTime: 60_000,
  });

  const lastAgo = timeAgo(lastCheckIn?.logged_at ?? null);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * STAGGER_DELAY, duration: 0.25, ease: CARD_EASE }}
      onClick={() => navigate("/check-in")}
      className={cn(
        "flex w-full items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3.5",
        "transition-[border-color,transform] duration-[160ms] ease-out hover:border-[var(--accent)] active:scale-[0.995]",
      )}
      aria-label="Registrar dolor"
    >
      <div className="flex items-center gap-3">
        <PulseIcon size={18} className="shrink-0 text-[var(--text-muted)]" />
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            Registrar dolor
          </span>
          {lastAgo && (
            <span className="font-mono text-[11px] tabular-nums text-[var(--text-faint)]">
              Último registro: {lastAgo}
            </span>
          )}
        </div>
      </div>
      <CaretRightIcon size={16} className="shrink-0 text-[var(--text-faint)]" />
    </motion.button>
  );
}

function QuickActions({ index }: { index: number }) {
  const openSheet = (sheet: string, dropTypeId?: string) => {
    window.dispatchEvent(
      new CustomEvent("quickactions:open", { detail: { sheet, dropTypeId } }),
    );
  };

  const primaryBtn = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-[999px] border px-4 text-[13px] font-medium",
        "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]",
        "transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]",
      )}
      aria-label="Registrar gota"
      onClick={() => openSheet("drop")}
    >
      <DropIcon size={14} weight="bold" />
      Gota
    </button>
  );

  const secondaryBtn = (label: string, icon: React.ReactNode, sheet: string) => (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-[999px] border px-4 text-[13px] font-medium",
        "border-[var(--border)] bg-transparent text-[var(--text-muted)]",
        "transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]",
        "hover:border-[var(--accent)] hover:text-[var(--accent)]",
      )}
      aria-label={`Registrar ${label.toLowerCase()}`}
      onClick={() => openSheet(sheet)}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * STAGGER_DELAY, duration: 0.25, ease: CARD_EASE }}
      className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)] p-4"
    >
      <p className="section-label mb-3">Acciones rápidas</p>
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2">
          {primaryBtn}
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 min-h-[48px] rounded-[999px] border px-4 text-[13px] font-medium",
              "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]",
              "transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]",
            )}
            aria-label="Registrar pastilla"
            onClick={() => openSheet("medication-intake")}
          >
            <PillIcon size={14} weight="bold" />
            Pastilla
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {secondaryBtn("Higiene", <EyeIcon size={14} />, "hygiene")}
          {secondaryBtn("Sueño", <MoonIcon size={14} />, "sleep")}
        </div>
      </div>
    </motion.div>
  );
}

export default function TodayPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      {/* Grupo: Agendas (lectura) */}
      <div className="space-y-2">
        <DropsScheduleCard />
        <MedicationsAgenda />

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 * STAGGER_DELAY, duration: 0.25, ease: CARD_EASE }}
          onClick={() => navigate("/treatments")}
          className={cn(
            "flex min-h-[48px] w-full items-center gap-2 rounded-[12px] px-2 text-left",
            "text-[13px] text-[var(--text-faint)]",
            "transition-[color,background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
            "hover:text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--surface-el)_12%,transparent)]",
          )}
          aria-label="Gestionar tratamientos"
        >
          <GearIcon size={14} />
          Gestionar tratamientos
          <CaretRightIcon size={12} className="ml-auto" />
        </motion.button>
      </div>

      {/* Grupo: Registros diarios */}
      <div className="space-y-2">
        <PainCheckInCard index={3} />
        <SleepNudge />
      </div>

      {/* Acciones rápidas */}
      <QuickActions index={5} />
    </section>
  );
}