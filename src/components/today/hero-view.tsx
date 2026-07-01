import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { AlarmIcon, CaretRightIcon } from "@phosphor-icons/react";
import { dropsApi, useInvalidateDrops } from "@/features/drops";
import { TopographicBg } from "@/components/ui/topographic-bg";
import { QuickLogCheck } from "./quick-log-check";
import { CountdownValue } from "./countdown-value";
import { ViewToggle } from "./view-toggle";
import { TimelineRow } from "./timeline-row";
import { HeroVialStatus } from "./hero-vial-status";
import { VialDiscardSheet } from "./vial-discard-sheet";
import { TodayDropsSheet } from "./today-drops-sheet";
import { useScheduleData } from "./use-schedule-data";
import { useDiscardVial } from "./use-discard-vial";
import { TodayCountBadge } from "./today-count-badge";
import { useQuickLog } from "./use-quick-log";
import type { ActiveVialEntry } from "./helpers";
import { getCountdown, dispatchQuickAction } from "./helpers";
import { useNow } from "@/lib/hooks/use-now";

function HeroCountdownRing({
  lastLoggedAt,
  intervalHours,
  pending,
  onClick,
}: {
  lastLoggedAt: string;
  intervalHours: number;
  pending: boolean;
  onClick: () => void;
}) {
  const now = useNow();
  const cd = getCountdown(lastLoggedAt, intervalHours, now);
  return (
    <CountdownValue
      label={cd.label}
      overdue={cd.overdue}
      color={pending ? "var(--accent-dim)" : cd.color}
      progress={cd.progress}
      onClick={onClick}
      size={120}
    />
  );
}

function HeroNextTime({
  lastLoggedAt,
  intervalHours,
}: {
  lastLoggedAt: string;
  intervalHours: number;
}) {
  const now = useNow();
  const { nextTime } = getCountdown(lastLoggedAt, intervalHours, now);
  return (
    <div className="flex items-center gap-1.5">
      <AlarmIcon size={14} weight="fill" className="shrink-0 text-[var(--accent)]" />
      <p className="font-mono text-[20px] font-semibold leading-none tabular-nums text-[var(--accent)]">
        {nextTime}
      </p>
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
  const [todayDropsOpen, setTodayDropsOpen] = useState(false);
  const [justRegistered, setJustRegistered] = useState<{ dropTypeId: string; takenAt: string } | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateDrops = useInvalidateDrops();
  const discardMutation = useDiscardVial(() => setDiscardTarget(null));
  const { quickLog, isPending: quickLogPending } = useQuickLog({
    onSuccess: (dropTypeId, dropId, vialId) => {
      const dropName = data.upcoming[0]?.name ?? "Dosis";
      clearTimerRef.current = setTimeout(() => {
        setJustRegistered(null);
        invalidateDrops(dropTypeId);
      }, 2500);
      toast.success(`${dropName} registrada`, {
        duration: 2500,
        action: {
          label: "Deshacer",
          onClick: () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            void (async () => {
              try {
                await dropsApi.remove(dropId);
                if (vialId) await dropsApi.deleteVial(vialId);
                setJustRegistered(null);
                invalidateDrops(dropTypeId);
              } catch {
                toast.error("No se pudo deshacer el registro");
              }
            })();
          },
        },
      });
    },
    onError: () => setJustRegistered(null),
  });

  const { upcoming, completado, sinRegistro, vialByDropType, todayCount } = data;

  if (upcoming.length === 0 && completado.length === 0 && sinRegistro.length === 0) return null;

  const heroEntry = upcoming[0] ?? null;
  const timelineEntries = upcoming.slice(1);
  const heroVial = heroEntry ? (vialByDropType.get(heroEntry.drop_type_id) ?? null) : null;
  const isRegistered = heroEntry ? justRegistered?.dropTypeId === heroEntry.drop_type_id : false;

  function handleQuickLog() {
    if (!heroEntry || quickLogPending || justRegistered) return;
    const takenAt = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    setJustRegistered({ dropTypeId: heroEntry.drop_type_id, takenAt });
    quickLog(heroEntry.drop_type_id, !!(heroEntry.is_vial && !heroVial));
  }

  const hasCountdown = !!(heroEntry?.last_logged_at && heroEntry?.interval_hours);

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
        <TopographicBg position="50% -40%" size="600px" />

        <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4">
          <p
            className="mb-0 text-[12px] font-semibold uppercase leading-none tracking-[0.10em] transition-colors duration-300"
            style={{ color: isRegistered ? "var(--pain-low)" : "var(--text-faint)" }}
          >
            {isRegistered ? "Gota registrada" : "Próxima gota"}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {todayCount > 0 && (
              <TodayCountBadge
                count={todayCount}
                onClick={() => setTodayDropsOpen(true)}
                className="h-8 px-2.5 text-[13px]"
                iconSize={13}
              />
            )}
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>

        {!heroEntry && completado.length > 0 && sinRegistro.length === 0 && (
          <div className="relative z-10 px-4 pb-5 pt-5">
            <p className="text-[15px] font-semibold text-[var(--pain-low)]">Todas las dosis completadas</p>
          </div>
        )}

        {heroEntry && (
          <div className="relative z-10 flex flex-col items-center gap-3 px-4 pb-5 pt-4 text-center">
            <AnimatePresence mode="wait" initial={false}>
              {isRegistered ? (
                <motion.div
                  key="check"
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                >
                  <QuickLogCheck color="var(--pain-low)" size={120} />
                </motion.div>
              ) : hasCountdown ? (
                <motion.div
                  key="ring"
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                >
                  <HeroCountdownRing
                    lastLoggedAt={heroEntry.last_logged_at!}
                    intervalHours={heroEntry.interval_hours!}
                    pending={quickLogPending}
                    onClick={handleQuickLog}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="interval"
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="grid h-[120px] w-[120px] content-center gap-2 justify-items-center text-center">
                    <p className="section-label mb-0">Cada</p>
                    <p className="font-mono text-[32px] font-semibold leading-none tabular-nums text-[var(--text-muted)]">
                      {heroEntry.interval_hours}h
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => !isRegistered && dispatchQuickAction("drop", { dropTypeId: heroEntry.drop_type_id })}
              aria-label={`Registrar dosis de ${heroEntry.name}`}
              className="group inline-flex min-w-0 max-w-full items-center justify-center gap-2 active:opacity-70"
              style={{ cursor: isRegistered ? "default" : "pointer" }}
            >
              <span
                className="truncate text-[24px] font-bold capitalize leading-none tracking-[-0.02em] transition-colors duration-300"
                style={{
                  color: isRegistered ? "var(--text-muted)" : "var(--text-primary)",
                  textDecorationLine: isRegistered ? "line-through" : "none",
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
            <div className="w-full" style={{ position: "relative" }}>
              <div
                className="flex justify-center"
                style={{ opacity: isRegistered ? 0 : 1, transition: "opacity 200ms ease" }}
              >
                {hasCountdown ? (
                  <HeroNextTime
                    lastLoggedAt={heroEntry.last_logged_at!}
                    intervalHours={heroEntry.interval_hours!}
                  />
                ) : (
                  <p className="font-mono text-[17px] tabular-nums text-[var(--text-muted)]">
                    Cada {heroEntry.interval_hours}h
                  </p>
                )}
              </div>
              {isRegistered && (
                <p className="anim-fade-up absolute inset-x-0 top-0 text-[14px] text-[var(--text-muted)]">
                  Tomada a las{" "}
                  <span className="font-mono font-semibold" style={{ color: "var(--pain-low)" }}>
                    {justRegistered?.takenAt ?? ""}
                  </span>
                </p>
              )}
            </div>

            {heroVial && (
              <>
                <div className="mx-auto h-px w-12 bg-[var(--border)]" />
                {/* vial — stays in DOM (preserve height), hidden when registered */}
                <div
                  style={{
                    opacity: isRegistered ? 0 : 1,
                    transition: "opacity 200ms ease",
                    pointerEvents: isRegistered ? "none" : "auto",
                  }}
                >
                  <HeroVialStatus vial={heroVial} onClick={() => setDiscardTarget(heroVial)} />
                </div>
              </>
            )}
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
    </>
  );
}
