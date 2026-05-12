import { CaretRightIcon, EyedropperSampleIcon, TrashIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { DropScheduleEntry } from "@/types/domain";
import type { ActiveVialEntry } from "./helpers";
import { getCountdown, getVialStatus, dispatchQuickAction } from "./helpers";

export function TimelineRow({
  entry,
  index,
  now,
  vial,
  onDiscardVial,
}: {
  entry: DropScheduleEntry;
  index: number;
  now: number;
  vial: ActiveVialEntry | null;
  onDiscardVial?: (vial: ActiveVialEntry) => void;
}) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at;
  const computed = noRecord ? null : getCountdown(entry.last_logged_at!, entry.interval_hours, now);
  const badgeLabel = noRecord ? "Sin registro" : computed!.label;
  const badgeColor = computed?.color ?? "var(--text-muted)";
  const vialStatus = vial ? getVialStatus(vial, now) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-[10px] px-3 cursor-pointer",
        vialStatus ? "py-2.5 min-h-[56px]" : "py-2 min-h-[44px]",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
      )}
      onClick={() => dispatchQuickAction("drop", { dropTypeId: entry.drop_type_id })}
      aria-label={`Registrar ${entry.name}. Próxima dosis ${badgeLabel}.`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dispatchQuickAction("drop", { dropTypeId: entry.drop_type_id });
        }
      }}
    >
      <span
        className="self-stretch w-[3px] shrink-0 rounded-full"
        style={{ background: badgeColor }}
        aria-hidden
      />

      <div className="grid min-w-0 flex-1 gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="font-mono text-[12px] tabular-nums whitespace-nowrap"
            style={{ color: "var(--text-faint)" }}
          >
            {computed?.nextTime ?? `cada ${entry.interval_hours}h`}
          </span>
          <span
            className="truncate text-[14px] font-bold capitalize leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {entry.name}
          </span>
        </span>

        {vialStatus && vial && onDiscardVial && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDiscardVial(vial);
            }}
            className="inline-flex w-fit items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-left transition-opacity hover:opacity-80 active:opacity-60"
            style={{ color: vialStatus.color }}
            aria-label={`Descartar vial de ${entry.name}`}
          >
            <EyedropperSampleIcon size={11} weight="fill" className="shrink-0" />
            <span className="min-w-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[0.04em] tabular-nums">
              {vialStatus.isExpired ? `vial vencido (+${vialStatus.timeStr})` : `vial ${vialStatus.timeStr}`}
            </span>
            <TrashIcon size={11} weight="regular" className="shrink-0" />
          </button>
        )}
      </div>

      <span className="flex shrink-0 items-center gap-1.5 pointer-events-none pt-0.5">
        <span
          className="font-mono text-[12px] font-semibold tabular-nums transition-transform duration-[160ms] ease-out group-hover:-translate-x-0.5"
          style={{ color: badgeColor, transition: "color 0.4s ease, transform 160ms ease-out" }}
        >
          {noRecord ? badgeLabel : `en ${badgeLabel}`}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="text-[var(--text-faint)] transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-70"
        />
      </span>
    </motion.div>
  );
}
