import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClockCountdownIcon, DropIcon, ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { MobileSheet } from "@/components/layout/mobile-sheet";

export type DoseSlot = {
  time: number;
  name: string;
  drop_type_id: string;
};

interface DayProjectionSheetProps {
  open: boolean;
  onClose: () => void;
  slots: DoseSlot[];
  now: number;
}

export function DayProjectionSheet({ open, onClose, slots, now }: DayProjectionSheetProps) {
  const sorted = useMemo(() => [...slots].filter((s) => s.time >= now).sort((a, b) => a.time - b.time), [slots, now]);
  const next = sorted[0] ?? null;
  const later = sorted.slice(1);

  const slotKey = (s: DoseSlot) => `${s.drop_type_id}-${s.time}`;
  const defaultKey = next ? slotKey(next) : null;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!open) {
      hasOpened.current = false;
      return;
    }
    if (hasOpened.current) return;
    hasOpened.current = true;
    setSelectedKey((prev) => prev ?? defaultKey);
  }, [open, defaultKey]);

  const selected = useMemo(() => {
    if (selectedKey == null) return next;
    const match = sorted.find((s) => slotKey(s) === selectedKey);
    return match ?? next;
  }, [selectedKey, sorted, next]);

  const timeLabel = (t: number) => new Date(t).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

  const countdown = (t: number) => {
    const diff = t - now;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `en ${h}h ${m}m` : `en ${m}m`;
  };

  const slotTimes = sorted.map((s) => s.time);
  const tMin = slotTimes.length > 0 ? now - 1_800_000 : 0;
  const tMax = slotTimes.length > 0 ? Math.max(...slotTimes, now) + 1_800_000 : 0;
  const range = tMax - tMin || 1;
  const pct = (t: number) => Math.max(1, Math.min(99, ((t - tMin) / range) * 100));
  const nowPct = pct(now);

  const selectedKind: "next" | "later" | null = selected ? (selected === next ? "next" : "later") : null;
  const heroAccent = selectedKind === "next" ? "var(--pain-low)" : "var(--accent)";
  const heroLabel = selectedKind === "next" ? "Próxima gota" : "Programada";

  return (
    <MobileSheet open={open} panelClassName="!h-[95dvh]" onClose={onClose} title="Proyección del día" description="Cronograma completo del día">
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <DropIcon size={24} weight="thin" aria-hidden style={{ color: "var(--text-faint)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            Registra tu primera gota de hoy para ver las siguientes.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interactive timeline */}
          <div>
            <div
              className="relative rounded-xl"
              style={{
                background: "var(--surface-el)",
                height: 56,
                paddingInline: 4,
              }}
            >
              {/* Past fill (subtle wash up to now) */}
              <div
                className="absolute top-0 bottom-0 left-0 rounded-l-xl pointer-events-none"
                style={{
                  width: `${nowPct}%`,
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--bg) 35%, transparent), color-mix(in srgb, var(--bg) 55%, transparent))",
                }}
              />
              {/* Connector track */}
              <div
                className="absolute left-3 right-3 pointer-events-none"
                style={{
                  top: "50%",
                  height: 2,
                  transform: "translateY(-50%)",
                  background: "color-mix(in srgb, var(--text-faint) 30%, transparent)",
                  borderRadius: 999,
                }}
              />
              {/* Future progress overlay (from now → last slot) */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                  left: `${nowPct}%`,
                  width: `${Math.max(0, pct(sorted[sorted.length - 1].time) - nowPct)}%`,
                  height: 2,
                  background: "linear-gradient(90deg, var(--pain-low), color-mix(in srgb, var(--accent) 60%, transparent))",
                  borderRadius: 999,
                  opacity: 0.65,
                }}
              />

              {/* Now indicator */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${nowPct}%`,
                  top: 6,
                  bottom: 6,
                  width: 2,
                  transform: "translateX(-50%)",
                  background: "var(--accent)",
                  borderRadius: 2,
                  boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 70%, transparent)",
                }}
              />
              <motion.div
                aria-hidden
                className="absolute pointer-events-none rounded-full"
                style={{
                  left: `${nowPct}%`,
                  top: "50%",
                  width: 6,
                  height: 6,
                  transform: "translate(-50%, -50%)",
                  background: "var(--accent)",
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Dots */}
              {sorted.map((slot) => {
                const isNext = slot === next;
                const isSelected = slotKey(slot) === selectedKey;
                const dotScale = isSelected ? 16 / 9 : isNext ? 12 / 9 : 1;
                const dotColor = isNext ? "var(--pain-low)" : "var(--accent)";
                return (
                  <motion.button
                    key={`tl-${slotKey(slot)}`}
                    type="button"
                    onClick={() => setSelectedKey(slotKey(slot))}
                    aria-label={`${slot.name} a las ${timeLabel(slot.time)}`}
                    aria-pressed={isSelected}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${pct(slot.time)}%`,
                      top: "50%",
                      x: "-50%",
                      y: "-50%",
                      width: 36,
                      height: 36,
                      background: "transparent",
                    }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="dot-ring"
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: 28,
                          height: 28,
                          border: `1.5px solid ${dotColor}`,
                          boxShadow: `0 0 12px color-mix(in srgb, ${dotColor} 55%, transparent)`,
                        }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                      />
                    )}
                    <span
                      className="rounded-full"
                      style={{
                        width: 9,
                        height: 9,
                        background: dotColor,
                        transform: `scale(${dotScale})`,
                        transition: "transform 380ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 200ms ease",
                        boxShadow: isNext && !isSelected ? `0 0 8px ${dotColor}` : "none",
                      }}
                    />
                  </motion.button>
                );
              })}
            </div>

            {/* Labels row: ahora + selected dot time */}
            <div className="relative h-5 mt-1.5">
              <span
                className="absolute -translate-x-1/2 font-mono text-[11px] font-semibold"
                style={{ left: `clamp(16px, ${nowPct}%, calc(100% - 24px))`, color: "var(--accent)" }}
              >
                ahora
              </span>
              <AnimatePresence mode="popLayout">
                {selected && Math.abs(pct(selected.time) - nowPct) > 8 && (
                  <motion.span
                    key={selectedKey ?? "none"}
                    initial={{ opacity: 0, transform: "translateY(-3px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    exit={{ opacity: 0, transform: "translateY(3px)" }}
                    transition={{ type: "spring", duration: 0.32, bounce: 0 }}
                    className="absolute -translate-x-1/2 font-mono text-[11px] font-semibold tabular-nums"
                    style={{
                      left: `clamp(20px, ${pct(selected.time)}%, calc(100% - 28px))`,
                      color: heroAccent,
                    }}
                  >
                    {timeLabel(selected.time)}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Selected dose hero — morphs based on selection */}
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selectedKey ?? "hero"}
                initial={{ opacity: 0, transform: "translateY(10px)", filter: "blur(4px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)", transition: { duration: 0.26, ease: [0.23, 1, 0.32, 1] } }}
                exit={{ opacity: 0, transform: "translateY(-6px)", filter: "blur(3px)", transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
                className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: "var(--surface-el)",
                  borderLeft: `3px solid ${heroAccent}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ClockCountdownIcon size={12} weight="bold" style={{ color: heroAccent }} aria-hidden />
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                        {heroLabel}
                      </p>
                    </div>
                    <p
                      className="tabular-nums leading-none"
                      style={{
                        color: "var(--text-primary)",
                        fontSize: 26,
                        fontWeight: 600,
                        opacity: 1,
                      }}
                    >
                      {timeLabel(selected.time)}
                    </p>
                    <p
                      className="text-[14px] font-medium capitalize mt-1.5 truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {selected.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className="font-mono text-[13px] font-semibold mt-1"
                      style={{ color: heroAccent }}
                    >
                      {countdown(selected.time)}
                    </span>
                    {selectedKind !== "next" && next && (
                      <button
                        type="button"
                        onClick={() => setSelectedKey(slotKey(next))}
                        className="flex items-center gap-1 text-[11px] font-medium transition-opacity duration-150 hover:opacity-70"
                        style={{ color: "var(--pain-low)" }}
                        aria-label="Volver a próxima dosis"
                      >
                        <ArrowUUpLeftIcon size={12} weight="bold" />
                        Próxima
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface-el)" }}>
                <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
                  No hay más dosis programadas hoy.
                </p>
              </div>
            )}
          </AnimatePresence>

          {/* Later doses — tappable rows */}
          {later.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
                Resto del día
              </p>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-el)" }}>
                {later.map((slot, i) => {
                  const isSelected = slotKey(slot) === selectedKey;
                  return (
                    <motion.button
                      key={`lt-${slotKey(slot)}`}
                      type="button"
                      onClick={() => setSelectedKey(slotKey(slot))}
                      initial={{ opacity: 0, transform: "translateY(5px)" }}
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      whileTap={{ transform: "scale(0.98)" }}
                      transition={{ delay: i * 0.04, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left"
                      style={{
                        borderBottom: i < later.length - 1 ? "1px solid var(--border)" : undefined,
                        background: isSelected ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                        transition: "background 180ms ease",
                      }}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          background: isSelected ? "var(--accent)" : "var(--text-faint)",
                          opacity: isSelected ? 1 : 0.5,
                        }}
                      />
                      <span
                        className="font-mono text-[12px] tabular-nums shrink-0"
                        style={{ color: isSelected ? "var(--text-primary)" : "var(--text-faint)", minWidth: 52 }}
                      >
                        {timeLabel(slot.time)}
                      </span>
                      <span
                        className="flex-1 min-w-0 truncate text-[13px] font-medium capitalize"
                        style={{ color: isSelected ? "var(--text-primary)" : "var(--text-muted)" }}
                      >
                        {slot.name}
                      </span>
                      <span
                        className="font-mono text-[11px] tabular-nums shrink-0"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {countdown(slot.time)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </MobileSheet>
  );
}
