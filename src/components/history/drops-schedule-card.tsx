import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DropScheduleEntry } from "@/types/domain";

function getCountdown(lastLoggedAt: string, intervalHours: number): { label: string; overdue: boolean; nextTime: string; color: string } {
  const nextMs = new Date(lastLoggedAt).getTime() + intervalHours * 3_600_000;
  const diffMs = nextMs - Date.now();
  const rawProgress = 1 - diffMs / (intervalHours * 3_600_000);
  const nextTime = new Date(nextMs).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  let label: string;
  let color: string;

  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    label = h > 0 ? `+${h}h ${m}m` : `+${m}m`;
    color = "var(--pain-high)";
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    color = rawProgress < 0.5 ? "var(--pain-low)" : rawProgress < 0.8 ? "var(--accent)" : "var(--pain-mid)";
  }

  return { label, overdue: diffMs <= 0, nextTime, color };
}

function ScheduleRow({ entry, index }: { entry: DropScheduleEntry; index: number }) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at;
  const computed = noRecord ? null : getCountdown(entry.last_logged_at!, entry.interval_hours);

  const openDropSheet = () => {
    window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop", dropTypeId: entry.drop_type_id } }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      className="flex items-center justify-between gap-3 cursor-pointer active:opacity-70 transition-opacity duration-[120ms]"
      role="button"
      tabIndex={0}
      aria-label={`Registrar ${entry.name}`}
      onClick={openDropSheet}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDropSheet(); } }}
    >
      <span
        className="text-[13px] capitalize truncate"
        style={{ color: computed?.overdue ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {entry.name}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {noRecord ? (
          <span className="font-mono text-[12px]" style={{ color: "var(--text-faint)" }}>
            c/{entry.interval_hours}h
          </span>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[14px] font-semibold tabular-nums"
              style={{ color: computed!.color, transition: "color 0.4s ease" }}
            >
              {computed!.label}
            </span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-faint)" }}>
              · {computed!.nextTime}
            </span>
          </div>
        )}
        <CaretRightIcon aria-hidden size={9} weight="bold" style={{ color: "var(--text-faint)" }} />
      </div>
    </motion.div>
  );
}

export function DropsScheduleCard() {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: entries = [] } = useQuery({
    queryKey: ["drops/last-per-type"],
    queryFn: api.getLastDropPerType,
    staleTime: 60_000,
  });

  const scheduled = entries.filter((e) => e.interval_hours != null);
  if (scheduled.length === 0) return null;

  const hasOverdue = scheduled.some(
    (e) =>
      e.last_logged_at != null &&
      e.interval_hours != null &&
      getCountdown(e.last_logged_at, e.interval_hours).overdue,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--text-faint)" }}
        >
          Próximas dosis
        </span>
        {hasOverdue && (
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="font-mono text-[10px]"
            style={{ color: "var(--pain-high)" }}
          >
            · urgente
          </motion.span>
        )}
      </div>

      <div className="space-y-3">
        {scheduled.map((entry, i) => (
          <ScheduleRow key={entry.drop_type_id} entry={entry} index={i} />
        ))}
      </div>
    </div>
  );
}
