import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRightIcon, CaretRightIcon, DropIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn, daysUntilEnd } from "@/lib/utils";
import type { DropScheduleEntry } from "@/types/domain";
import { DayProjectionSheet, type DoseSlot } from "@/components/register/day-projection-sheet";

function getCountdown(lastLoggedAt: string, intervalHours: number, now: number): { label: string; overdue: boolean; nextTime: string; color: string } {
  const nextMs = new Date(lastLoggedAt).getTime() + intervalHours * 3_600_000;
  const diffMs = nextMs - now;
  const rawProgress = 1 - diffMs / (intervalHours * 3_600_000);
  const nd = new Date(nextMs);
  const nh = nd.getHours(), nm = nd.getMinutes();
  const nextTime = `${String(nh % 12 || 12).padStart(2, "0")}:${String(nm).padStart(2, "0")} ${nh < 12 ? "am" : "pm"}`;

  let label: string;
  let color: string;

  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    label = h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`;
    color = "var(--pain-high)";
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    color = rawProgress < 0.5 ? "var(--pain-low)" : rawProgress < 0.8 ? "var(--accent)" : "var(--pain-mid)";
  }

  return { label, overdue: diffMs <= 0, nextTime, color };
}

function getNextMs(entry: DropScheduleEntry): number {
  if (!entry.last_logged_at || !entry.interval_hours) return Number.POSITIVE_INFINITY;
  return new Date(entry.last_logged_at).getTime() + entry.interval_hours * 3_600_000;
}


function buildDayProjection(entries: DropScheduleEntry[]): DoseSlot[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 86_400_000;

  const slots: DoseSlot[] = [];

  for (const entry of entries) {
    if (!entry.interval_hours || !entry.last_logged_at) continue;
    const intervalMs = entry.interval_hours * 3_600_000;
    let cursor = new Date(entry.last_logged_at).getTime() + intervalMs;

    while (cursor - intervalMs >= todayStart.getTime()) {
      cursor -= intervalMs;
    }
    while (cursor < todayEnd) {
      if (cursor >= todayStart.getTime()) {
        slots.push({ time: cursor, name: entry.name, drop_type_id: entry.drop_type_id });
      }
      cursor += intervalMs;
    }
  }

  return slots.sort((a, b) => a.time - b.time);
}


function ScheduleRow({ entry, index, now }: { entry: DropScheduleEntry; index: number; now: number }) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at;
  const computed = noRecord ? null : getCountdown(entry.last_logged_at!, entry.interval_hours, now);
  const detail = noRecord
    ? `cada ${entry.interval_hours}h`
    : computed!.overdue
      ? `era ${computed!.nextTime}`
      : computed!.nextTime;
  const badgeLabel = noRecord ? "Sin registro" : computed!.label;
  const badgeColor = computed?.color ?? "var(--text-muted)";

  const suspDays = entry.end_date ? daysUntilEnd(entry.end_date) : null;
  const isUrgentSuspension = suspDays != null && suspDays >= 0 && suspDays <= 7;

  const ariaLabel = noRecord
    ? `Registrar ${entry.name}. Sin registro previo, intervalo cada ${entry.interval_hours} horas.`
    : isUrgentSuspension
      ? `Registrar ${entry.name}. Suspender en ${suspDays}d. Próxima dosis ${computed!.label}.`
      : `Registrar ${entry.name}. Próxima dosis ${computed!.label}, a las ${computed!.nextTime}.`;

  const openDropSheet = () => {
    window.dispatchEvent(new CustomEvent("quickactions:open", { detail: { sheet: "drop", dropTypeId: entry.drop_type_id } }));
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group grid min-h-[34px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[9px] px-1 py-1 text-left",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
      )}
      aria-label={ariaLabel}
      onClick={openDropSheet}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {isUrgentSuspension ? (
          <WarningIcon size={14} className="shrink-0 text-[var(--warning)]" weight="fill" />
        ) : (
          <span
            className="shrink-0 flex items-center justify-center rounded-[8px]"
            style={{
              width: 32,
              height: 32,
              background: `color-mix(in srgb, ${badgeColor} 12%, var(--surface-el))`,
            }}
            aria-hidden
          >
            <DropIcon size={15} style={{ color: badgeColor }} />
          </span>
        )}
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className="truncate text-[13px] font-medium capitalize leading-none"
            style={{ color: computed?.overdue ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {entry.name}
          </span>
          {isUrgentSuspension && (
            <>
              <span className="shrink-0 text-[11px] leading-none" style={{ color: "var(--text-faint)" }}>·</span>
              <span className="truncate font-mono text-[11px] leading-none tabular-nums" style={{ color: "var(--warning)" }}>
                suspender {suspDays}d
              </span>
            </>
          )}
          <span className="shrink-0 text-[11px] leading-none" style={{ color: "var(--text-faint)" }}>
            ·
          </span>
          <span className="truncate font-mono text-[11px] leading-none tabular-nums" style={{ color: "var(--text-faint)" }}>
            {detail}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className="font-mono text-[11px] font-semibold tabular-nums transition-transform duration-[160ms] ease-out group-hover:-translate-x-0.5"
          style={{ color: badgeColor, transition: "color 0.4s ease, transform 160ms ease-out" }}
        >
          {badgeLabel}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="translate-x-0 transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-70 group-focus-visible:opacity-70"
          style={{ color: "var(--text-faint)" }}
        />
      </span>
    </motion.button>
  );
}

export function DropsScheduleCard() {
  const [now, setNow] = useState(() => Date.now());
  const [projectionOpen, setProjectionOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: entries = [] } = useQuery({
    queryKey: ["drops/last-per-type"],
    queryFn: api.getLastDropPerType,
    staleTime: 60_000,
  });

  const scheduled = useMemo(
    () =>
      entries
        .filter((e) => e.interval_hours != null)
        .filter((e) => !(e.end_date && daysUntilEnd(e.end_date) < 0))
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [entries],
  );

  const { data: calendarData } = useQuery({
    queryKey: ["calendar/events/today"],
    queryFn: api.getCalendarEventsToday,
    staleTime: 60_000,
  });

  const daySlots = useMemo<DoseSlot[]>(() => {
    const calEvents = calendarData?.events;
    if (calEvents && calEvents.length > 0) {
      return calEvents
        .map((e) => ({ time: new Date(e.scheduled_at).getTime(), name: e.name, drop_type_id: e.drop_type_id }))
        .sort((a, b) => a.time - b.time);
    }
    return buildDayProjection(entries);
  }, [calendarData, entries]);

  if (scheduled.length === 0) return null;

  return (
    <>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <p className="section-label mb-0">Próximas dosis</p>
          <button
            type="button"
            onClick={() => setProjectionOpen(true)}
            aria-label="Ver proyección del día"
            className="flex items-center gap-1 rounded-sm text-[11px] font-medium transition-opacity duration-[160ms] hover:opacity-75 active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
          >
            <span style={{ color: "var(--accent)" }}>Ver día</span>
            <ArrowRightIcon size={10} weight="bold" aria-hidden style={{ color: "var(--accent)" }} />
          </button>
        </div>

        <div className="space-y-0">
          {scheduled.map((entry, i) => (
            <ScheduleRow key={entry.drop_type_id} entry={entry} index={i} now={now} />
          ))}
        </div>
      </div>

      <DayProjectionSheet
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        slots={daySlots}
        now={now}
      />
    </>
  );
}
