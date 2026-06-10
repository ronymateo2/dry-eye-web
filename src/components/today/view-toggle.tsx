import { PresentationIcon, ListDashesIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
