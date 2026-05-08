import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PulseIcon, CaretRightIcon, GearIcon } from "@phosphor-icons/react";
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

  return (
    <section className="space-y-5">
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
