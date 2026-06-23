import { memo, useMemo } from "react";
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

  const selected = useMemo(() => {
    const byId = new Map(stats.map((s) => [s.drop_type_id, s]));
    return user.widget_drop_type_ids
      .map((id) => byId.get(id))
      .filter((s): s is DropTypeStats => Boolean(s));
  }, [stats, user.widget_drop_type_ids]);

  if (selected.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
      <div className="px-4 pt-4 pb-3">
        <p className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] text-[var(--text-faint)]">
          Seguimiento de gotas
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        {selected.map((s) => {
          const { days, avgPerDay } = computeStreak(s);
          return (
            <div
              key={s.drop_type_id}
              className="relative flex flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-el)] p-3.5"
            >
              <p className="truncate text-[13px] font-semibold capitalize leading-snug text-[var(--text-primary)]">
                {s.name}
              </p>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-[34px] font-bold leading-none tabular-nums text-[var(--accent)]">
                  {days}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  {days === 1 ? "día" : "días"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-faint)]">
                promedio{" "}
                <span className="font-mono font-semibold text-[var(--text-muted)]">
                  {avgPerDay.toFixed(1)}
                </span>
                /día
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
