import { useState } from "react";
import { AlarmIcon, CheckCircleIcon, CaretRightIcon } from "@phosphor-icons/react";
import { DayProjectionSheet } from "@/components/register/day-projection-sheet";
import { TopographicBg } from "@/components/ui/topographic-bg";
import { CountdownValue } from "./countdown-value";
import { ViewDayButton, ViewToggle } from "./view-toggle";
import { TimelineRow } from "./timeline-row";
import { HeroVialStatus } from "./hero-vial-status";
import { VialDiscardSheet } from "./vial-discard-sheet";
import { useScheduleData } from "./use-schedule-data";
import { useDiscardVial } from "./use-discard-vial";
import type { ActiveVialEntry } from "./helpers";
import { getCountdown, dispatchQuickAction } from "./helpers";

export function HeroView({
  data,
  view,
  setView,
}: {
  data: ReturnType<typeof useScheduleData>;
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  const [discardTarget, setDiscardTarget] = useState<ActiveVialEntry | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const discardMutation = useDiscardVial(() => setDiscardTarget(null));

  const { now, scheduled, daySlots, vialByDropType } = data;

  if (scheduled.length === 0) return null;

  const heroEntry = scheduled[0];
  const timelineEntries = scheduled.slice(1);
  const heroVial = vialByDropType.get(heroEntry.drop_type_id) ?? null;

  const computed =
    heroEntry.last_logged_at && heroEntry.interval_hours
      ? getCountdown(heroEntry.last_logged_at, heroEntry.interval_hours, now)
      : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-card)]">
        <TopographicBg position="calc(100% + 20px) -10px" size="600px" />

        <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4">
          <p className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] text-[var(--text-faint)]">Próxima dosis</p>
          <div className="flex shrink-0 items-center gap-2">
            <ViewDayButton onClick={() => setProjectionOpen(true)} />
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        <div className="relative z-10 grid gap-5 px-4 pb-5 pt-5">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-4">
            <div className="pt-1">
              {computed ? (
                <CountdownValue
                  label={computed.label}
                  overdue={computed.overdue}
                  color={computed.color}
                  progress={computed.progress}
                  onClick={() => dispatchQuickAction("drop", { dropTypeId: heroEntry.drop_type_id })}
                />
              ) : (
                <div className="grid gap-2 justify-items-center text-center">
                  <p className="section-label mb-0">Cada</p>
                  <p className="font-mono text-[28px] font-semibold leading-none tabular-nums text-[var(--text-muted)]">
                    {heroEntry.interval_hours}h
                  </p>
                </div>
              )}
            </div>

            <div className="grid min-w-0 gap-2 pt-1">
              <h2 className="min-w-0 max-w-full truncate text-[28px] font-bold capitalize leading-none tracking-[-0.02em] text-[var(--text-primary)]">
                {heroEntry.name}
              </h2>

              {computed ? (
                <div className="flex items-center gap-1.5">
                  <AlarmIcon size={14} weight="fill" className="shrink-0 text-[var(--accent)]" />
                  <p className="font-mono text-[20px] font-semibold leading-none tabular-nums text-[var(--accent)]">
                    {computed.nextTime}
                  </p>
                </div>
              ) : (
                <p className="font-mono text-[17px] tabular-nums text-[var(--text-muted)]">
                  Cada {heroEntry.interval_hours}h
                </p>
              )}

              <div className="h-px w-[80%] bg-[var(--border)] my-1" />

              {heroVial && (
                <HeroVialStatus vial={heroVial} now={now} onClick={() => setDiscardTarget(heroVial)} />
              )}

              <button
                type="button"
                onClick={() => dispatchQuickAction("drop", { dropTypeId: heroEntry.drop_type_id })}
                aria-label={`Registrar dosis de ${heroEntry.name}`}
                className="group inline-flex items-center gap-1.5 text-[15px] font-semibold transition-colors hover:text-[var(--accent-bright)] active:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                <CheckCircleIcon size={16} weight="bold" className="shrink-0" />
                Registrar dosis
                <CaretRightIcon
                  size={14}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>

        {timelineEntries.length > 0 && (
          <div className="relative z-10 border-t border-[var(--border)]">
            <div className="flex items-baseline gap-3 px-4 py-3">
              <p className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] text-[var(--text-faint)]">Después de esta</p>
            </div>
            <div className="space-y-0 px-1 pb-2">
              {timelineEntries.map((entry, i) => {
                const vial = vialByDropType.get(entry.drop_type_id) ?? null;
                return (
                <TimelineRow
                  key={entry.drop_type_id}
                  entry={entry}
                  index={i}
                  now={now}
                  vial={vial}
                  onDiscardVial={(v) => setDiscardTarget(v)}
                />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <VialDiscardSheet
        vial={discardTarget}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() => discardTarget && discardMutation.mutate(discardTarget.id)}
        isPending={discardMutation.isPending}
      />

      <DayProjectionSheet
        open={projectionOpen}
        onClose={() => setProjectionOpen(false)}
        slots={daySlots}
        now={now}
      />
    </>
  );
}
