import { motion } from "motion/react";
import { ArrowCounterClockwiseIcon, ClockIcon } from "@phosphor-icons/react";
import { painColor } from "@/lib/pain";

type LastCheckInData = {
  logged_at: string;
  eyelid_pain: number;
  temple_pain: number;
  masseter_pain: number;
  cervical_pain: number;
  orbital_pain: number;
  stress_level: number;
  trigger_type: string | null;
  notes: string | null;
};

type Props = {
  data: LastCheckInData;
  triggerLabel: string | null;
  formatLoggedAt: (iso: string) => string;
  formatTimeAgo: (iso: string) => string;
  onApply: () => void;
};

const ZONES: { key: keyof LastCheckInData; label: string }[] = [
  { key: "eyelid_pain", label: "Ojo/Parpados" },
  { key: "temple_pain", label: "Sienes" },
  { key: "orbital_pain", label: "Zona orbital" },
  { key: "masseter_pain", label: "Masetero" },
  { key: "cervical_pain", label: "Cervical" },
  { key: "stress_level", label: "Estres" },
];

export function LastCheckInRecall({
  data,
  triggerLabel,
  formatLoggedAt,
  formatTimeAgo,
  onApply,
}: Props) {
  const peak = Math.max(
    data.eyelid_pain,
    data.temple_pain,
    data.masseter_pain,
    data.cervical_pain,
    data.orbital_pain,
  );
  const peakColor = painColor(peak);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
      className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface-el)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{ background: peakColor, opacity: 0.55 }}
      />

      <div className="flex items-start justify-between gap-3 px-3.5 pt-3.5 pb-3">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            <ClockIcon size={11} weight="bold" />
            Ultimo registro
          </p>
          <p className="mt-1 text-[12.5px] leading-tight text-[var(--text-muted)]">
            {formatLoggedAt(data.logged_at)}
            <span className="mx-1.5 opacity-50">·</span>
            <span className="text-[var(--text-faint)]">
              {formatTimeAgo(data.logged_at)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[var(--accent-dim)] px-3 text-[12.5px] font-semibold text-[var(--accent)] transition-[transform,background-color] duration-150 ease-out hover:bg-[var(--accent)] hover:text-[var(--btn-primary-text)] active:scale-[0.96]"
          aria-label="Cargar valores del ultimo registro"
        >
          <ArrowCounterClockwiseIcon
            size={14}
            weight="bold"
            className="transition-transform duration-300 group-hover:-rotate-180"
          />
          Usar valores
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2 px-3.5 pb-3">
        {ZONES.map((z) => {
          const value = data[z.key] as number;
          const color = painColor(value);
          return (
            <li
              key={z.key}
              className="flex min-w-0 items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2"
            >
              <span className="truncate text-[13px] text-[var(--text-muted)]">
                {z.label}
              </span>
              <span
                className="mono ml-2 shrink-0 text-[14px] font-semibold tabular-nums"
                style={{ color: value === 0 ? "var(--text-faint)" : color }}
              >
                {value}
              </span>
            </li>
          );
        })}
      </ul>

      {(triggerLabel || data.notes) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] bg-[var(--surface-card)] px-3.5 py-2.5">
          {triggerLabel && (
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
              <span className="mr-1 text-[var(--text-faint)]">Trigger</span>
              <span className="font-medium text-[var(--text-primary)]">
                {triggerLabel}
              </span>
            </span>
          )}
          {data.notes && (
            <span className="min-w-0 max-w-full truncate text-[11px] italic text-[var(--text-muted)]">
              "{data.notes}"
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
