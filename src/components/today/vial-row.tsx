import { TrashIcon, EyedropperSampleIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import type { ActiveVialEntry } from "./helpers";
import { getVialStatus } from "./helpers";

export function VialRow({
  vial,
  index,
  now,
  isConfirming,
  onRequestDiscard,
  onCancel,
  onConfirmDiscard,
  isPending,
}: {
  vial: ActiveVialEntry;
  index: number;
  now: number;
  isConfirming: boolean;
  onRequestDiscard: () => void;
  onCancel: () => void;
  onConfirmDiscard: () => void;
  isPending: boolean;
}) {
  const status = getVialStatus(vial, now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="group min-h-[34px] w-full overflow-hidden rounded-[9px]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isConfirming ? (
          <motion.div
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 py-1"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="shrink-0 flex items-center justify-center rounded-[8px]"
                style={{
                  width: 32,
                  height: 32,
                  background: "var(--surface-el)",
                }}
                aria-hidden
              >
                <EyedropperSampleIcon size={15} style={{ color: status.color }} />
              </span>
              <span
                className="truncate text-[17px] font-medium capitalize leading-none"
                style={{ color: status.isExpired ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {vial.drop_type_name}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <span
                className="font-mono text-[15px] font-medium tabular-nums"
                style={{ color: status.color }}
              >
                {status.rightLabel}
              </span>
              <button
                type="button"
                onClick={onRequestDiscard}
                className="flex items-center justify-center w-7 h-7 rounded-full text-[var(--text-faint)] opacity-60 hover:opacity-100 hover:bg-[var(--surface-el)] active:bg-[var(--surface-el)] active:text-[var(--error)] transition-all duration-[160ms]"
                aria-label={`Descartar ${vial.drop_type_name}`}
              >
                <TrashIcon size={15} weight="regular" />
              </button>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-between gap-3 px-3 py-1 min-h-[44px]"
          >
            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--error)]">
              ¿Descartar {vial.drop_type_name}?
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-el)]"
              >
                No
              </button>
              <button
                type="button"
                onClick={onConfirmDiscard}
                disabled={isPending}
                className="rounded-full bg-[var(--error)]/10 px-3 py-1.5 text-[13px] font-medium text-[var(--error)] transition-opacity hover:bg-[var(--error)]/20 disabled:opacity-50"
              >
                {isPending ? "…" : "Sí"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
