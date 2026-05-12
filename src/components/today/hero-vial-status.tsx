import { TrashIcon, EyedropperSampleIcon } from "@phosphor-icons/react";
import type { ActiveVialEntry } from "./helpers";
import { getVialStatus } from "./helpers";

export function HeroVialStatus({
  vial,
  now,
  onClick,
}: {
  vial: ActiveVialEntry;
  now: number;
  onClick: () => void;
}) {
  const status = getVialStatus(vial, now);

  if (status.isExpired) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-80 active:opacity-60"
        style={{ color: "var(--pain-high)" }}
        aria-label={`Vial vencido (+${status.timeStr}). Toca para descartar.`}
      >
        <EyedropperSampleIcon size={12} weight="fill" className="shrink-0" />
        <span>Vial vencido (+{status.timeStr})</span>
        <TrashIcon size={14} weight="regular" className="shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 text-[12px] transition-colors hover:opacity-80 active:opacity-60"
      style={{ color: status.color }}
      aria-label={`Vial vence en ${status.timeStr}. Toca para descartar.`}
    >
      <EyedropperSampleIcon size={12} weight="fill" className="shrink-0" />
      <span>Vial vence en {status.timeStr}</span>
      <TrashIcon size={14} weight="regular" className="shrink-0" />
    </button>
  );
}
