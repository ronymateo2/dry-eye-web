import { CalendarDotsIcon, ClockCountdownIcon, ListDashesIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function ViewDayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ver proyección del día"
      className="flex min-h-8 items-center gap-1 rounded-full px-1 text-[12px] font-medium transition-opacity duration-[160ms] hover:opacity-75 active:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
    >
      <CalendarDotsIcon size={13} weight="bold" aria-hidden style={{ color: "var(--accent)" }} />
      <span style={{ color: "var(--accent)" }}>Horario</span>
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
        <ClockCountdownIcon size={13} />
      </button>
    </div>
  );
}
