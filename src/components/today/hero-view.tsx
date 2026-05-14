import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlarmIcon, CaretRightIcon, EyedropperIcon } from "@phosphor-icons/react";
import { DayProjectionSheet } from "@/components/register/day-projection-sheet";
import { TopographicBg } from "@/components/ui/topographic-bg";
import { CountdownValue } from "./countdown-value";
import { ViewDayButton, ViewToggle } from "./view-toggle";
import { TimelineRow } from "./timeline-row";
import { HeroVialStatus } from "./hero-vial-status";
import { VialDiscardSheet } from "./vial-discard-sheet";
import { TodayDropsSheet } from "./today-drops-sheet";
import { useScheduleData } from "./use-schedule-data";
import { useDiscardVial } from "./use-discard-vial";
import { useQuickLog } from "./use-quick-log";
import { api } from "@/lib/api";
import type { ActiveVialEntry } from "./helpers";
import { getCountdown, dispatchQuickAction } from "./helpers";

function QuickLogCheck() {
  return (
    <div style={{ width: 88, height: 88, display: "grid", placeItems: "center" }}>
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "color-mix(in srgb, var(--pain-low) 16%, transparent)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--pain-low)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M5 12.5l4.5 4.5L19 7"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 30,
              animation: "qlDrawCheck 400ms ease-out 130ms forwards",
            }}
          />
        </svg>
      </motion.div>
      <style>{`@keyframes qlDrawCheck { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}

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
  const [todayDropsOpen, setTodayDropsOpen] = useState(false);
  const [justRegistered, setJustRegistered] = useState<{ dropTypeId: string; takenAt: string } | null>(null);

  const discardMutation = useDiscardVial(() => setDiscardTarget(null));
  const { quickLog, isPending: quickLogPending } = useQuickLog({
    onSuccess: () => {
      setTimeout(() => setJustRegistered(null), 1400);
    },
    onError: () => setJustRegistered(null),
  });

  const { now, upcoming, completado, sinRegistro, daySlots, vialByDropType } = data;

  const { data: allRecentDrops = [] } = useQuery({
    queryKey: ["drops/recent-all"],
    queryFn: () => api.getRecentDropsAll(24),
    staleTime: 30_000,
  });

  if (upcoming.length === 0 && completado.length === 0 && sinRegistro.length === 0) return null;

  const heroEntry = upcoming[0] ?? null;
  const timelineEntries = upcoming.slice(1);
  const heroVial = heroEntry ? (vialByDropType.get(heroEntry.drop_type_id) ?? null) : null;
  const todayCount = allRecentDrops.filter(
    (d) => new Date(d.logged_at).toDateString() === new Date().toDateString(),
  ).length;
  const isRegistered = heroEntry ? justRegistered?.dropTypeId === heroEntry.drop_type_id : false;

  function handleQuickLog() {
    if (!heroEntry || quickLogPending || justRegistered) return;
    const d = new Date();
    const takenAt = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setJustRegistered({ dropTypeId: heroEntry.drop_type_id, takenAt });
    quickLog(heroEntry.drop_type_id);
  }

  const computed =
    heroEntry?.last_logged_at && heroEntry?.interval_hours
      ? getCountdown(heroEntry.last_logged_at, heroEntry.interval_hours, now)
      : null;

  return (
    <>
      <motion.div
        layout
        transition={{ layout: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } }}
        className="relative overflow-hidden rounded-[16px] border transition-colors duration-300"
        style={{
          background: isRegistered
            ? "color-mix(in srgb, var(--pain-low) 7%, var(--surface-card))"
            : "var(--surface-card)",
          borderColor: isRegistered
            ? "color-mix(in srgb, var(--pain-low) 30%, var(--border))"
            : "var(--border)",
        }}
      >
        <TopographicBg position="calc(100% + 20px) -10px" size="600px" />

        <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4">
          <p
            className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] transition-colors duration-300"
            style={{ color: isRegistered ? "var(--pain-low)" : "var(--text-faint)" }}
          >
            {isRegistered ? "Dosis registrada" : "Próxima dosis"}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <ViewDayButton onClick={() => setProjectionOpen(true)} />
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        {heroEntry && (
          <div className="relative z-10 grid gap-5 px-4 pb-5 pt-5">
            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-4">
              <div className="pt-1">
                {isRegistered ? (
                  <QuickLogCheck />
                ) : computed ? (
                  <CountdownValue
                    label={computed.label}
                    overdue={computed.overdue}
                    color={quickLogPending ? "var(--accent-dim)" : computed.color}
                    progress={computed.progress}
                    onClick={handleQuickLog}
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

              <div className="grid min-w-0 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => !isRegistered && dispatchQuickAction("drop", { dropTypeId: heroEntry.drop_type_id })}
                  aria-label={`Registrar dosis de ${heroEntry.name}`}
                  className="group inline-flex min-w-0 max-w-full items-center gap-2 text-left active:opacity-70"
                  style={{ cursor: isRegistered ? "default" : "pointer" }}
                >
                  <span
                    className="truncate text-[28px] font-bold capitalize leading-none tracking-[-0.02em] transition-colors duration-300"
                    style={{
                      color: isRegistered ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: isRegistered ? "line-through" : "none",
                      textDecorationColor: "rgba(0,0,0,0.2)",
                    }}
                  >
                    {heroEntry.name}
                  </span>
                  {!isRegistered && (
                    <CaretRightIcon
                      size={18}
                      weight="bold"
                      className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: "var(--text-faint)" }}
                    />
                  )}
                </button>

                {/* alarm/time row — stays in DOM; "Tomada a las" overlaid in same spot */}
                <div style={{ position: "relative" }}>
                  <div style={{ opacity: isRegistered ? 0 : 1, transition: "opacity 200ms ease" }}>
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
                  </div>
                  {isRegistered && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="absolute inset-x-0 top-0 text-[14px] text-[var(--text-muted)]"
                    >
                      Tomada a las{" "}
                      <span className="font-mono font-semibold" style={{ color: "var(--pain-low)" }}>
                        {justRegistered?.takenAt ?? ""}
                      </span>
                    </motion.p>
                  )}
                </div>

                <div className="h-px w-[80%] bg-[var(--border)]" />

                {/* vial + badge — stay in DOM (preserve height), hidden when registered */}
                <div
                  style={{
                    opacity: isRegistered ? 0 : 1,
                    transition: "opacity 200ms ease",
                    pointerEvents: isRegistered ? "none" : "auto",
                  }}
                >
                  {heroVial && (
                    <HeroVialStatus vial={heroVial} now={now} onClick={() => setDiscardTarget(heroVial)} />
                  )}
                  {todayCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setTodayDropsOpen(true)}
                      aria-label={`Ver ${todayCount} dosis registradas hoy`}
                      className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1.5 text-[13px] font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 active:scale-[0.97] active:bg-[var(--accent)]/25"
                    >
                      <EyedropperIcon size={12} weight="bold" />
                      {todayCount} {todayCount === 1 ? "dosis hoy" : "dosis hoy"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(timelineEntries.length > 0 || completado.length > 0 || sinRegistro.length > 0) && (
          <div className="relative z-10 border-t border-[var(--border)]">
            <div className="space-y-0 px-1 pb-2 pt-1">
              {[
                ...timelineEntries.map((e) => ({ entry: e, variant: "upcoming" as const })),
                ...completado.map((e) => ({ entry: e, variant: "completado" as const })),
                ...sinRegistro.map((e) => ({ entry: e, variant: "sinRegistro" as const })),
              ].map(({ entry, variant }, i) => {
                const vial = vialByDropType.get(entry.drop_type_id) ?? null;
                return (
                  <TimelineRow
                    key={entry.drop_type_id}
                    entry={entry}
                    index={i}
                    now={now}
                    vial={vial}
                    onDiscardVial={(v) => setDiscardTarget(v)}
                    variant={variant}
                  />
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      <VialDiscardSheet
        vial={discardTarget}
        onClose={() => setDiscardTarget(null)}
        onConfirm={() => discardTarget && discardMutation.mutate(discardTarget.id)}
        isPending={discardMutation.isPending}
      />

      <TodayDropsSheet
        open={todayDropsOpen}
        onClose={() => setTodayDropsOpen(false)}
        initialDropTypeId={heroEntry?.drop_type_id ?? ""}
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
