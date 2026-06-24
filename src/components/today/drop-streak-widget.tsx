import { memo } from "react";
import { useDropStatsPerType } from "@/features/drops";
import { useUser } from "@/lib/auth";
import type { DropTypeStats } from "@/types/domain";

function computeStreak(s: DropTypeStats) {
  const firstDate = s.first_logged_at ? new Date(s.first_logged_at) : null;
  const lastDate = s.last_logged_at ? new Date(s.last_logged_at) : new Date();
  const days = firstDate
    ? Math.floor((lastDate.getTime() - firstDate.getTime()) / 86400e3) + 1
    : 0;
  const avgPerDay = s.total_uses > 0 ? s.total_uses / Math.max(days, 1) : 0;
  return { days, avgPerDay };
}

export const DropStreakWidget = memo(function DropStreakWidget() {
  const user = useUser();
  const { data: stats = [] } = useDropStatsPerType(user.widget_drop_type_ids);

  if (stats.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-[16px] border bg-[var(--surface-card)]"
      style={{ borderColor: "var(--info-border)" }}
      aria-labelledby="drop-streak-label"
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <p
          id="drop-streak-label"
          className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-[var(--text-muted)]"
        >
          Seguimiento de gotas
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {stats.map((s, i) => {
          const { days, avgPerDay } = computeStreak(s);
          return (
            <div
              key={s.drop_type_id}
              className="anim-fade-up relative flex flex-col overflow-hidden rounded-[12px] border border-[var(--border)] p-4"
              style={{
                ["--i" as string]: i,
                background:
                  "linear-gradient(180deg, var(--accent-dim), var(--surface-el))",
              }}
            >
              <p className="truncate text-[14px] font-semibold capitalize leading-snug text-[var(--text-primary)]">
                {s.name}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className="font-mono font-bold leading-none tabular-nums text-[var(--accent)]"
                  style={{ fontSize: "clamp(42px, 12vw, 52px)" }}
                >
                  {days}
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[var(--text-muted)]">
                  {days === 1 ? "día" : "días"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--border)] pt-2.5">
                <span className="text-[11px] text-[var(--text-faint)]">
                  promedio
                </span>
                <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--text-muted)]">
                  {avgPerDay.toFixed(1)}
                </span>
                <span className="text-[11px] text-[var(--text-faint)]">/día</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
