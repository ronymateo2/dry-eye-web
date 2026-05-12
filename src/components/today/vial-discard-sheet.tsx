import { useMemo } from "react";
import type { ActiveVialEntry } from "./helpers";
import { getVialStatus, timeAgo } from "./helpers";
import { MobileSheet } from "@/components/layout/mobile-sheet";
import { EyedropperSampleIcon, ClockIcon, TimerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function VialDiscardSheet({
  vial,
  onClose,
  onConfirm,
  isPending,
}: {
  vial: ActiveVialEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const now = useMemo(() => Date.now(), []);

  const status = useMemo(() => {
    if (!vial) return null;
    return getVialStatus(vial, now);
  }, [vial, now]);

  const progress = useMemo(() => {
    if (!vial) return 0;
    const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
    const elapsed = now - new Date(vial.started_at).getTime();
    return Math.min(1, Math.max(0, elapsed / durationMs));
  }, [vial, now]);

  const openedAgo = useMemo(() => (vial ? timeAgo(vial.started_at) : null), [vial]);

  return (
    <MobileSheet
      open={vial !== null}
      title="Descartar vial"
      description={vial?.drop_type_name ?? ""}
      onClose={onClose}
    >
      {vial && status && (
        <div className="space-y-4 pt-1">
          {/* Vial icon + status badge */}
          <div className="flex flex-col items-center gap-3 py-3">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-2",
                status.isExpired
                  ? "border-[var(--error)]/30 bg-[var(--error)]/10"
                  : status.isWarning
                    ? "border-[var(--warning)]/30 bg-[var(--warning)]/10"
                    : "border-[var(--success)]/30 bg-[var(--success)]/10",
              )}
            >
              <EyedropperSampleIcon size={28} style={{ color: status.color }} />
            </div>

            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium",
                status.isExpired
                  ? "bg-[var(--error)]/12 text-[var(--error)]"
                  : status.isWarning
                    ? "bg-[var(--warning)]/12 text-[var(--warning)]"
                    : "bg-[var(--success)]/12 text-[var(--success)]",
              )}
            >
              <TimerIcon size={11} weight="fill" />
              {status.rightLabel}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="mb-0.5 flex items-center gap-1.5">
                <ClockIcon size={11} className="text-[var(--text-faint)]" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                  Abierto
                </span>
              </div>
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                {openedAgo}
              </span>
            </div>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="mb-0.5 flex items-center gap-1.5">
                <TimerIcon size={11} className="text-[var(--text-faint)]" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                  Duración
                </span>
              </div>
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                {vial.vial_duration ?? 24}h
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-faint)]">Vida del vial</span>
              <span className="font-mono text-[11px] text-[var(--text-faint)]">
                {Math.min(100, Math.round(progress * 100))}% usado
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-el)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, progress * 100)}%`, backgroundColor: status.color }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="w-full rounded-[14px] bg-[var(--error)]/10 py-4 text-[15px] font-semibold text-[var(--error)] transition-opacity disabled:opacity-50 hover:bg-[var(--error)]/20"
            >
              {isPending ? "…" : "Sí, descartar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-[14px] py-4 text-[15px] font-medium text-[var(--text-muted)] transition-opacity hover:opacity-70"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </MobileSheet>
  );
}
