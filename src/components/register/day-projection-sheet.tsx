import { motion } from "motion/react";
import { DropIcon } from "@phosphor-icons/react";
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
  const past = slots.filter((s) => s.time < now);
  const future = slots.filter((s) => s.time >= now);
  const next = future[0] ?? null;
  const later = future.slice(1);
  const lastPast = past.length > 0 ? past[past.length - 1] : null;

  const timeLabel = (t: number) => new Date(t).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  const countdown = (t: number) => {
    const diff = t - now;
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    const str = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return diff < 0 ? `hace ${str}` : `en ${str}`;
  };

  const urgencyOpacity = (t: number) => {
    const diff = t - now;
    if (diff < 2 * 3_600_000) return 1;
    if (diff < 4 * 3_600_000) return 0.65;
    return 0.4;
  };

  const slotTimes = slots.map((s) => s.time);
  const tMin = slotTimes.length > 0 ? Math.min(...slotTimes) - 1_800_000 : 0;
  const tMax = slotTimes.length > 0 ? Math.max(...slotTimes) + 1_800_000 : 0;
  const range = tMax - tMin || 1;
  const pct = (t: number) => Math.max(1, Math.min(99, ((t - tMin) / range) * 100));
  const nowPct = pct(now);

  return (
    <MobileSheet open={open} panelClassName="!h-[95dvh]" onClose={onClose} title="Proyección del día" description="Cronograma completo del día">
      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <DropIcon size={24} weight="thin" aria-hidden style={{ color: "var(--text-faint)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            Registra tu primera gota de hoy para ver las siguientes.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Horizontal overview strip */}
          <div>
            <div className="relative h-8 rounded-xl overflow-hidden" style={{ background: "var(--surface-el)" }}>
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{ width: `${nowPct}%`, background: "color-mix(in srgb, var(--bg) 55%, transparent)" }}
              />
              {slots.map((slot) => {
                const isPast = slot.time < now;
                const isNext = slot === next;
                return (
                  <div
                    key={`tl-${slot.drop_type_id}-${slot.time}`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                    style={{ left: `${pct(slot.time)}%` }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: isNext ? 13 : 8,
                        height: isNext ? 13 : 8,
                        background: isPast ? "var(--text-faint)" : isNext ? "var(--pain-low)" : "var(--text-muted)",
                        opacity: isPast ? 0.3 : 1,
                        boxShadow: isNext ? "0 0 8px var(--pain-low)" : "none",
                      }}
                    />
                  </div>
                );
              })}
              <div
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 pointer-events-none"
                style={{ left: `${nowPct}%`, background: "var(--accent)", boxShadow: "0 0 5px var(--accent)" }}
              />
            </div>
            <div className="relative h-5 mt-1">
              <span
                className="absolute -translate-x-1/2 font-mono text-[10px] font-semibold"
                style={{ left: `clamp(16px, ${nowPct}%, calc(100% - 24px))`, color: "var(--accent)" }}
              >
                ahora
              </span>
            </div>
          </div>

          {/* Last past slot + AHORA divider */}
          {lastPast && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--text-faint)" }}>
                  {timeLabel(lastPast.time)}
                </span>
                <span className="text-[13px] font-medium capitalize" style={{ color: "var(--text-faint)" }}>
                  {lastPast.name}
                </span>
                <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-faint)" }}>
                  {countdown(lastPast.time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1" style={{ background: "var(--accent)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                  Ahora
                </span>
                <div className="h-px flex-1" style={{ background: "var(--accent)" }} />
              </div>
            </div>
          )}

          {/* Next dose hero */}
          {next ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-xl p-4"
              style={{ background: "var(--surface-el)", borderLeft: "3px solid var(--pain-low)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
                    Próxima dosis
                  </p>
                  <p className="tabular-nums leading-none" style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 600 }}>
                    {timeLabel(next.time)}
                  </p>
                  <p className="text-[14px] font-medium capitalize mt-1.5" style={{ color: "var(--text-muted)" }}>
                    {next.name}
                  </p>
                </div>
                <span className="font-mono text-[13px] font-semibold mt-1 shrink-0" style={{ color: "var(--pain-low)" }}>
                  {countdown(next.time)}
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface-el)" }}>
              <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
                No hay más dosis programadas hoy.
              </p>
            </div>
          )}

          {/* Later doses with urgency gradient */}
          {later.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
                Resto del día
              </p>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-el)" }}>
                {later.map((slot, i) => {
                  const opacity = urgencyOpacity(slot.time);
                  return (
                    <motion.div
                      key={`lt-${slot.drop_type_id}-${slot.time}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity }}
                      transition={{ delay: 0.05 + i * 0.02, duration: 0.18 }}
                      className="flex items-center gap-3 px-3 py-3"
                      style={{ borderBottom: i < later.length - 1 ? "1px solid var(--border)" : undefined }}
                    >
                      <span className="font-mono text-[12px] tabular-nums shrink-0" style={{ color: "var(--text-faint)", minWidth: 52 }}>
                        {timeLabel(slot.time)}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[13px] font-medium capitalize" style={{ color: "var(--text-muted)" }}>
                        {slot.name}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums shrink-0" style={{ color: "var(--text-faint)" }}>
                        {countdown(slot.time)}
                      </span>
                    </motion.div>
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
