import { CalendarDotsIcon, PresentationIcon, ListDashesIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function ViewDayButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver proyección del día"
      className={cn(
        "flex items-center rounded-full transition-colors duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40",
        compact
          ? "h-8 w-8 justify-center bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 active:scale-[0.97] active:bg-[var(--accent)]/25"
          : "min-h-8 gap-1 px-1 text-[12px] font-medium hover:opacity-75 active:opacity-50",
      )}
    >
      <CalendarDotsIcon size={compact ? 16 : 13} weight="bold" aria-hidden style={{ color: "var(--accent)" }} />
      {!compact && <span style={{ color: "var(--accent)" }}>Horario</span>}
    </button>
  );
}

export function ViewToggle({
  view,
  setView,
}: {
  view: "card" | "hero";
  setView: (v: "card" | "hero") => void;
}) {
  return (
    <div className="flex h-9 w-[66px] shrink-0 items-center justify-between rounded-full bg-[var(--surface-el)] p-1">
      <button
        type="button"
        onClick={() => setView("card")}
        aria-label="Vista tarjeta"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-[160ms]",
          view === "card"
            ? "bg-[var(--accent)] text-[var(--btn-primary-text)]"
            : "text-[var(--text-faint)] hover:text-[var(--text-muted)]",
        )}
      >
        <ListDashesIcon size={13} />
      </button>
      <button
        type="button"
        onClick={() => setView("hero")}
        aria-label="Vista hero"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-[160ms]",
          view === "hero"
            ? "bg-[var(--accent)] text-[var(--btn-primary-text)]"
            : "text-[var(--text-faint)] hover:text-[var(--text-muted)]",
        )}
      >
        <PresentationIcon size={13} />
      </button>
    </div>
  );
}
