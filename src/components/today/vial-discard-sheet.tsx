import type { ActiveVialEntry } from "./helpers";
import { MobileSheet } from "@/components/layout/mobile-sheet";

export function VialDiscardSheet({
  vial,
  onClose,
  onConfirm,
  isPending,
}: {
  vial: ActiveVialEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <MobileSheet
      open={vial !== null}
      title="Descartar vial"
      description={vial?.drop_type_name ?? ""}
      onClose={onClose}
    >
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="w-full rounded-[14px] bg-[var(--error)]/10 py-4 text-[15px] font-semibold text-[var(--error)] transition-opacity disabled:opacity-50 hover:bg-[var(--error)]/20"
        >
          {isPending ? "…" : "Sí, descartar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[14px] py-4 text-[15px] font-medium text-[var(--text-muted)] transition-opacity hover:opacity-70"
        >
          Cancelar
        </button>
      </div>
    </MobileSheet>
  );
}
