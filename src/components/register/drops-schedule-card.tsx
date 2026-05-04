import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRightIcon, CaretRightIcon, DropIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DropScheduleEntry } from "@/types/domain";
import { MobileSheet } from "@/components/layout/mobile-sheet";

function getCountdown(lastLoggedAt: string, intervalHours: number, now: number): { label: string; overdue: boolean; nextTime: string; color: string } {
  const nextMs = new Date(lastLoggedAt).getTime() + intervalHours * 3_600_000;
  const diffMs = nextMs - now;
  const rawProgress = 1 - diffMs / (intervalHours * 3_600_000);
  const nextTime = new Date(nextMs).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

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
    label = h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
    color = rawProgress < 0.5 ? "var(--pain-low)" : rawProgress < 0.8 ? "var(--accent)" : "var(--pain-mid)";
  }

  return { label, overdue: diffMs <= 0, nextTime, color };
}

function getNextMs(entry: DropScheduleEntry): number {
  if (!entry.last_logged_at || !entry.interval_hours) return Number.POSITIVE_INFINITY;
  return new Date(entry.last_logged_at).getTime() + entry.interval_hours * 3_600_000;
}

type DoseSlot = {
  time: number;
  name: string;
  drop_type_id: string;
};

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

function DayProjectionSheet({ open, onClose, slots, now }: { open: boolean; onClose: () => void; slots: DoseSlot[]; now: number }) {
  const firstFutureIdx = slots.findIndex((s) => s.time > now);
  const timeLabel = (t: number) => new Date(t).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Proyección del día"
      description="Cronograma completo del día"
    >
      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <DropIcon size={24} weight="thin" aria-hidden style={{ color: "var(--text-faint)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            Registra tu primera gota de hoy para ver las siguientes.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* spine aligns with center of 16px dot col: 60px + 8px gap + 8px = 76px */}
          <div
            className="absolute left-[76px] top-2 bottom-2 w-px"
            style={{ background: "var(--border)" }}
          />

          <div className="space-y-0">
            {slots.map((slot, i) => {
              const overdue = slot.time < now;
              const isNext = i === firstFutureIdx;
              const isFuture = slot.time > now;
              const dotColor = overdue ? "var(--pain-high)" : isNext ? "var(--pain-low)" : "var(--text-faint)";
              const nameColor = overdue ? "var(--text-primary)" : isFuture && !isNext ? "var(--text-faint)" : "var(--text-muted)";

              const diffMs = slot.time - now;
              let countdownLabel: string;
              if (overdue) {
                const abs = -diffMs;
                const h = Math.floor(abs / 3_600_000);
                const m = Math.floor((abs % 3_600_000) / 60_000);
                countdownLabel = h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`;
              } else {
                const h = Math.floor(diffMs / 3_600_000);
                const m = Math.floor((diffMs % 3_600_000) / 60_000);
                countdownLabel = h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
              }

              const showNowLine = firstFutureIdx !== -1 && i === firstFutureIdx;

              return (
                <motion.div
                  key={`${slot.drop_type_id}-${slot.time}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {showNowLine && (
                    <div className="flex items-center gap-2 py-2 pl-[76px]">
                      <div className="h-px flex-1" style={{ background: "var(--accent)" }} />
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                        Ahora
                      </span>
                      <div className="h-px flex-1" style={{ background: "var(--accent)" }} />
                    </div>
                  )}

                  <div className="grid grid-cols-[60px_16px_1fr] items-center gap-2 py-2">
                    <span
                      className="text-right font-mono text-[12px] tabular-nums leading-none"
                      style={{ color: overdue ? "var(--pain-high)" : "var(--text-faint)" }}
                    >
                      {timeLabel(slot.time)}
                    </span>

                    <div className="flex justify-center">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: dotColor }}
                      />
                    </div>

                    <div className="flex min-w-0 items-baseline gap-1.5">
                      <span
                        className="truncate text-[13px] font-medium capitalize leading-none"
                        style={{ color: nameColor }}
                      >
                        {slot.name}
                      </span>
                      <span
                        className="shrink-0 font-mono text-[11px] tabular-nums leading-none"
                        style={{ color: overdue ? "var(--pain-high)" : "var(--text-faint)" }}
                      >
                        {countdownLabel}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </MobileSheet>
  );
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
  const ariaLabel = noRecord
    ? `Registrar ${entry.name}. Sin registro previo, intervalo cada ${entry.interval_hours} horas.`
    : `Registrar ${entry.name}. Proxima dosis ${computed!.label}, a las ${computed!.nextTime}.`;

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
        <span
          className="h-4 w-[3px] shrink-0 rounded-full opacity-90 transition-[height,opacity] duration-[160ms] ease-out group-hover:h-5 group-hover:opacity-100"
          style={{ background: badgeColor }}
        />
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span
            className="truncate text-[13px] font-medium capitalize leading-none"
            style={{ color: computed?.overdue ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {entry.name}
          </span>
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
        .sort((a, b) => getNextMs(a) - getNextMs(b)),
    [entries],
  );

  const daySlots = useMemo(() => buildDayProjection(entries), [entries]);

  if (scheduled.length === 0) return null;

  const hasOverdue = scheduled.some(
    (e) =>
      e.last_logged_at != null &&
      e.interval_hours != null &&
      getCountdown(e.last_logged_at, e.interval_hours, now).overdue,
  );

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
            {hasOverdue && (
              <>
                <span style={{ color: "var(--pain-high)" }}>Vencida</span>
                <span style={{ color: "var(--text-faint)" }}>·</span>
              </>
            )}
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
