import type { CSSProperties } from "react";
import { CaretRightIcon, EyedropperSampleIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/hooks/use-now";
import type { DropScheduleEntry } from "@/types/domain";
import type { ActiveVialEntry } from "./helpers";
import { getCountdown, getVialStatus, dispatchQuickAction } from "./helpers";

export function TimelineRow({
  entry,
  index,
  vial,
  onDiscardVial,
  variant = "upcoming",
}: {
  entry: DropScheduleEntry;
  index: number;
  vial: ActiveVialEntry | null;
  onDiscardVial?: (vial: ActiveVialEntry) => void;
  variant?: "upcoming" | "completado" | "sinRegistro";
}) {
  const now = useNow();
  if (!entry.interval_hours) return null;

  const noRecord = !entry.last_logged_at || variant === "sinRegistro";
  const isCompleted = variant === "completado";
  const computed = (noRecord || isCompleted) ? null : getCountdown(entry.last_logged_at!, entry.interval_hours, now);
  const badgeLabel = noRecord ? "Sin registro" : isCompleted ? "Completado" : computed!.label;
  const badgeColor = isCompleted ? "var(--pain-low)" : computed?.color ?? "var(--text-muted)";
  const vialStatus = vial ? getVialStatus(vial, now) : null;
  const timeLabel = (noRecord || isCompleted) ? `c/${entry.interval_hours}h` : computed!.nextTime;
  const badgeText = (noRecord || isCompleted || computed!.overdue) ? badgeLabel : `en ${badgeLabel}`;
  const pillTint = noRecord ? 10 : 12;

  return (
    <div
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "anim-fade-up",
        "group relative flex items-start gap-3 w-full rounded-[12px] px-3 py-2 cursor-pointer",
        "transition-[background-color,transform] duration-[160ms] ease-out active:scale-[0.995]",
        "hover:bg-[color-mix(in_srgb,var(--surface-el)_18%,transparent)]",
      )}
      onClick={() => dispatchQuickAction("drop", { dropTypeId: entry.drop_type_id })}
      aria-label={`Registrar ${entry.name}. Próxima gota ${badgeLabel}.`}
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
        className="font-mono text-[14px] tabular-nums whitespace-nowrap w-[44px] shrink-0 text-right pt-[3px]"
        style={{ color: "var(--text-faint)" }}
      >
        {timeLabel}
      </span>

      <div className="min-w-0 flex-1 flex flex-col gap-0.5 pt-[2px]">
        <span
          className="truncate text-[17px] font-semibold capitalize leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {entry.name}
        </span>

        {vialStatus && vial && onDiscardVial && (
          <div className="flex items-center gap-1.5">
            <EyedropperSampleIcon
              size={12}
              weight="fill"
              className="shrink-0"
              style={{ color: vialStatus.isExpired ? "var(--pain-high)" : vialStatus.color }}
            />
            <span
              className="text-[14px] font-medium tabular-nums whitespace-nowrap"
              style={{ color: vialStatus.isExpired ? "var(--pain-high)" : vialStatus.color }}
            >
              {vialStatus.rightLabel}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDiscardVial(vial);
              }}
              className="shrink-0 text-[var(--text-faint)] transition-opacity hover:opacity-80 active:opacity-60"
              aria-label={`Descartar vial de ${entry.name}`}
            >
              <TrashIcon size={14} weight="regular" />
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 pt-[2px]">
        <span
          className="inline-flex h-[24px] items-center rounded-full px-2.5 font-mono text-[13px] font-medium tabular-nums whitespace-nowrap"
          style={{
            color: badgeColor,
            background: `color-mix(in srgb, ${badgeColor} ${pillTint}%, transparent)`,
            transition: "color 0.4s ease, background-color 0.4s ease",
          }}
        >
          {badgeText}
        </span>
        <CaretRightIcon
          aria-hidden
          size={9}
          weight="bold"
          className="text-[var(--text-faint)] transition-[opacity,transform] duration-[160ms] ease-out group-hover:translate-x-0.5 group-hover:opacity-70"
        />
      </div>
    </div>
  );
}
