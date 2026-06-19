import { TrashIcon, EyedropperSampleIcon } from "@phosphor-icons/react";
import { useNow } from "@/lib/hooks/use-now";
import type { ActiveVialEntry } from "./helpers";
import { getVialStatus } from "./helpers";

export function HeroVialStatus({
  vial,
  onClick,
}: {
  vial: ActiveVialEntry;
  onClick: () => void;
}) {
  const now = useNow();
  const status = getVialStatus(vial, now);

  const label = status.isExpired
    ? `Vial vencido (+${status.timeStr})`
    : `Vial vence en ${status.timeStr}`;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-80 active:opacity-60"
        style={{ color: status.isExpired ? "var(--pain-high)" : status.color }}
        aria-label={`${label}. Toca para descartar.`}
      >
        <EyedropperSampleIcon size={12} weight="fill" className="shrink-0" />
        <span>{label}</span>
      </button>

      <button
        type="button"
        onClick={onClick}
        className="shrink-0 text-[var(--text-muted)] transition-opacity hover:opacity-80 active:opacity-60"
        aria-label="Descartar vial"
      >
        <TrashIcon size={14} weight="regular" />
      </button>
    </div>
  );
}
