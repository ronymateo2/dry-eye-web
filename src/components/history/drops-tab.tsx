import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { EyedropperIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { getDayKey } from "@/lib/utils";
import { EYE_SHORT } from "./types";
import { formatShortDate, getDayPillLabel } from "./utils";

const DROP_TYPE_COLORS = [
  "var(--accent)",
  "var(--pain-low)",
  "var(--pain-mid)",
  "#c97b4b",
  "#c8d450",
  "#d06050",
];

export function DropsTab({ timezone }: { timezone: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["drops/stats-per-type"],
    queryFn: api.getDropStatsPerType,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-[14px] bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
        Aún no tienes tipos de gota. Crea uno en la sección de tipos de gota.
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-3">
      {stats.map((s, index) => {
        const firstDate = s.first_logged_at ? new Date(s.first_logged_at) : null;
        const daysSinceFirst = firstDate
          ? Math.floor((now - firstDate.getTime()) / 86400e3) + 1
          : 0;
        const avgPerDay =
          s.total_uses > 0
            ? (s.total_uses / Math.max(daysSinceFirst, 1)).toFixed(1)
            : null;

        const firstDayKey = s.first_logged_at ? getDayKey(s.first_logged_at, timezone) : null;
        const lastDayKey = s.last_logged_at ? getDayKey(s.last_logged_at, timezone) : null;

        const firstLabel = firstDayKey ? formatShortDate(firstDayKey) : null;
        const lastLabel = lastDayKey
          ? (getDayPillLabel(lastDayKey, timezone) ?? formatShortDate(lastDayKey))
          : null;

        const color = DROP_TYPE_COLORS[index % DROP_TYPE_COLORS.length];

        const eyeEntries = (
          [
            { key: "left" as const, count: s.uses_left },
            { key: "right" as const, count: s.uses_right },
            { key: "both" as const, count: s.uses_both },
          ] as { key: keyof typeof EYE_SHORT; count: number }[]
        ).filter((e) => e.count > 0);

        return (
          <motion.div
            key={s.drop_type_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.22,
              ease: [0.23, 1, 0.32, 1],
              delay: Math.min(index, 4) * 0.055,
            }}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  <EyedropperIcon size={16} weight="duotone" color={color} />
                </div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                  {s.name}
                </p>
              </div>
              <span className="mono shrink-0 inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-[var(--surface-el)] text-[11px] font-semibold text-[var(--text-muted)]">
                {s.total_uses}
              </span>
            </div>

            {s.total_uses === 0 ? (
              <p className="px-4 py-3 text-[12px] text-[var(--text-faint)]">Sin registros aún.</p>
            ) : (
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)] mb-0.5">
                      Primer uso
                    </p>
                    <p className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
                      {firstLabel}
                      {daysSinceFirst > 0 && (
                        <span className="text-[var(--text-muted)]"> ({daysSinceFirst}d)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)] mb-0.5">
                      Último uso
                    </p>
                    <p className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
                      {lastLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)] mb-0.5">
                      Total gotas
                    </p>
                    <p className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
                      {s.total_quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-faint)] mb-0.5">
                      Promedio/día
                    </p>
                    <p className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
                      {avgPerDay}
                    </p>
                  </div>
                </div>

                {eyeEntries.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {eyeEntries.map((e) => (
                      <span
                        key={e.key}
                        className="mono inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-[0.06em] bg-[var(--surface-el)] text-[var(--text-muted)]"
                      >
                        {EYE_SHORT[e.key]}{" "}
                        <span className="tabular-nums text-[var(--text-primary)]">{e.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
