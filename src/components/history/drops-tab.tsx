import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { CalendarIcon, EyedropperIcon } from "@phosphor-icons/react";
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

function formatDuration(days: number): string {
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const rem = days % 30;
  return rem > 0 ? `${months}m ${rem}d` : `${months}m`;
}

function StatCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-wide uppercase text-[var(--text-muted)]">{label}</span>
      <span className="mono text-[15px] tabular-nums text-[var(--text-primary)]">{children}</span>
    </div>
  );
}

export function DropsTab({ timezone }: { timezone: string }) {
  const reducedMotion = useReducedMotion();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["drops/stats-per-type"],
    queryFn: api.getDropStatsPerType,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-[14px] bg-[var(--surface)]" />
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

        const durationMonths = daysSinceFirst >= 30 ? Math.floor(daysSinceFirst / 30) : null;
        const durationRem = durationMonths ? daysSinceFirst % 30 : null;

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
            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducedMotion ? 0.1 : 0.22,
              ease: [0.23, 1, 0.32, 1],
              delay: reducedMotion ? 0 : Math.min(index, 4) * 0.055,
            }}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border)]">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
              >
                <EyedropperIcon size={16} weight="duotone" color={color} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate leading-snug">
                  {s.name}
                </p>
              </div>
              {daysSinceFirst > 0 && (
                <div className="mono shrink-0 text-right leading-none">
                  <div className="text-[18px] font-bold text-[var(--text-primary)] leading-none">
                    {durationMonths
                      ? `${durationMonths}m${durationRem ? ` ${durationRem}d` : ""}`
                      : `${daysSinceFirst}d`}
                  </div>
                  {firstLabel && lastLabel && (
                    <div className="flex items-center justify-end gap-1 text-[10px] text-[var(--text-faint)] mt-1.5">
                      <CalendarIcon size={10} weight="regular" />
                      <span>{firstLabel} — {lastLabel}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body */}
            {s.total_uses === 0 ? (
              <p className="px-4 py-3 text-[12px] text-[var(--text-faint)]">Sin registros aún.</p>
            ) : (
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <StatCell label="Total gotas">{s.total_uses}</StatCell>
                  {avgPerDay && <StatCell label="Promedio/día">{avgPerDay}</StatCell>}
                </div>
                {eyeEntries.length > 0 && (
                  <div className="flex gap-2">
                    {eyeEntries.map((e) => (
                      <span
                        key={e.key}
                        className="mono inline-flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${color} 12%, var(--surface-el))`,
                          color: `color-mix(in srgb, ${color} 70%, var(--text-muted))`,
                        }}
                      >
                        {EYE_SHORT[e.key]} {e.count}
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
