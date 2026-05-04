import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DropScheduleEntry } from "@/types/domain";

type ScheduleState = {
  label: string;
  overdue: boolean;
  nextTime: string;
  progress: number;
  barColor: string;
  glowColor: string;
};

function getScheduleState(lastLoggedAt: string, intervalHours: number): ScheduleState {
  const startMs = new Date(lastLoggedAt).getTime();
  const intervalMs = intervalHours * 3_600_000;
  const nextMs = startMs + intervalMs;
  const now = Date.now();
  const diffMs = nextMs - now;
  const rawProgress = (now - startMs) / intervalMs;
  const overdue = diffMs <= 0;

  const nextTime = new Date(nextMs).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let label: string;
  if (overdue) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    label = h > 0 ? `+${h}h ${m}m` : `+${m}m`;
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  let barColor: string;
  let glowColor: string;
  if (overdue) {
    barColor = "var(--pain-high)";
    glowColor = "rgba(204,63,48,0.5)";
  } else if (rawProgress < 0.5) {
    barColor = "var(--pain-low)";
    glowColor = "rgba(92,184,90,0.4)";
  } else if (rawProgress < 0.8) {
    barColor = "var(--accent)";
    glowColor = "rgba(212,162,76,0.4)";
  } else {
    barColor = "var(--pain-mid)";
    glowColor = "rgba(224,147,42,0.4)";
  }

  return { label, overdue, nextTime, progress: Math.min(rawProgress, 1), barColor, glowColor };
}

function ScheduleRow({ entry, index }: { entry: DropScheduleEntry; index: number }) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at;
  const state = noRecord ? null : getScheduleState(entry.last_logged_at!, entry.interval_hours);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
      className="grid gap-x-3 gap-y-1.5"
      style={{ gridTemplateColumns: "1fr auto" }}
    >
      {/* Name */}
      <span
        className="text-[11px] capitalize truncate leading-none"
        style={{ color: state?.overdue ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {entry.name}
      </span>

      {/* Countdown */}
      {noRecord ? (
        <span className="font-mono text-[11px] leading-none" style={{ color: "var(--text-faint)" }}>
          c/{entry.interval_hours}h
        </span>
      ) : (
        <div className="flex items-baseline gap-1 leading-none">
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: state!.barColor, transition: "color 0.4s ease" }}
          >
            {state!.label}
          </span>
          {!state!.overdue && (
            <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--text-faint)" }}>
              · {state!.nextTime}
            </span>
          )}
        </div>
      )}

      {/* Progress bar — spans both columns */}
      <div style={{ gridColumn: "1 / -1" }}>
        {noRecord ? (
          <div
            className="h-[2px] w-full rounded-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 3px, transparent 3px, transparent 7px)",
            }}
          />
        ) : (
          <div
            className="relative h-[2px] w-full overflow-hidden rounded-full"
            style={{ background: "var(--surface-el)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${state!.progress * 100}%` }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: index * 0.07 + 0.1 }}
              style={{
                background: state!.barColor,
                boxShadow: `0 0 6px ${state!.glowColor}`,
                transition: "background 0.4s ease, box-shadow 0.4s ease",
              }}
            />
          </div>
        )}
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
      getScheduleState(e.last_logged_at, e.interval_hours).overdue,
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

      <div className="space-y-4">
        {scheduled.map((entry, i) => (
          <ScheduleRow key={entry.drop_type_id} entry={entry} index={i} />
        ))}
      </div>
    </div>
  );
}
