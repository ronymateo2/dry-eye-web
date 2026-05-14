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
  variant = "upcoming",
}: {
  entry: DropScheduleEntry;
  index: number;
  now: number;
  vial: ActiveVialEntry | null;
  onDiscardVial?: (vial: ActiveVialEntry) => void;
  variant?: "upcoming" | "completado" | "sinRegistro";
}) {
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at || variant === "sinRegistro";
  const isCompleted = variant === "completado";
  const computed = (noRecord || isCompleted) ? null : getCountdown(entry.last_logged_at!, entry.interval_hours, now);
  const badgeLabel = noRecord ? "Sin registro" : isCompleted ? "Completado" : computed!.label;
  const badgeColor = isCompleted ? "var(--pain-low)" : computed?.color ?? "var(--text-muted)";
  const vialStatus = vial ? getVialStatus(vial, now) : null;
  const timeLabel = (noRecord || isCompleted) ? `c/${entry.interval_hours}h` : computed!.nextTime;
  const badgeText = (noRecord || isCompleted) ? badgeLabel : `en ${badgeLabel}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative flex flex-col w-full rounded-[10px] px-3 cursor-pointer",
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
      <div className="flex items-center gap-2 min-h-[44px]">
        <span
          className="w-[3px] shrink-0 self-stretch rounded-full opacity-60 scale-y-[0.82] origin-center transition-[opacity,transform] duration-[160ms] ease-out group-hover:opacity-100 group-hover:scale-y-100"
          style={{ background: badgeColor }}
          aria-hidden
        />

        <span
          className="font-mono text-[13px] tabular-nums whitespace-nowrap w-[46px] shrink-0 text-right"
          style={{ color: "var(--text-faint)" }}
        >
          {timeLabel}
        </span>

        <span
          className="truncate text-[17px] font-medium capitalize leading-none flex-1 ml-1"
          style={{ color: "var(--text-primary)" }}
        >
          {entry.name}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 pointer-events-none">
          <span
            className="font-mono text-[15px] font-medium tabular-nums transition-transform duration-[160ms] ease-out group-hover:-translate-x-0.5"
            style={{ color: badgeColor, transition: "color 0.4s ease, transform 160ms ease-out" }}
          >
            {badgeText}
          </span>
          <CaretRightIcon
            aria-hidden
            size={9}
            weight="bold"
            className="text-[var(--text-faint)] transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-70"
          />
        </span>
      </div>

      {vialStatus && vial && onDiscardVial && (
        <div className="flex items-center gap-1.5 pb-2 -mt-0.5 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDiscardVial(vial);
            }}
            className="flex flex-1 items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-left transition-opacity hover:opacity-80 active:opacity-60"
            style={{ color: vialStatus.isExpired ? "var(--pain-high)" : vialStatus.color }}
            aria-label={`Descartar vial de ${entry.name}`}
          >
            <EyedropperSampleIcon size={11} weight="fill" className="shrink-0" />
            <span className="min-w-0 truncate font-mono text-[11px] font-medium uppercase tracking-[0.04em] tabular-nums">
              {vialStatus.isExpired ? `vial vencido (+${vialStatus.timeStr})` : `vial ${vialStatus.timeStr}`}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDiscardVial(vial);
            }}
            className="shrink-0 text-[var(--text-muted)] transition-opacity hover:opacity-80 active:opacity-60"
            aria-label={`Descartar vial de ${entry.name}`}
          >
            <TrashIcon size={11} weight="regular" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
