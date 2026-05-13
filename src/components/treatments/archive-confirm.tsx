import { Button } from "@/components/ui/button";

export function ArchiveConfirm({
  label,
  isPending,
  onConfirm,
  onCancel,
}: {
  label: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(204,63,48,0.25)] bg-[rgba(204,63,48,0.07)] p-4 space-y-3">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <div className="flex gap-2">
        <Button
          variant="tinted-error"
          size="sm"
          className="flex-1"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? "Archivando..." : "Archivar"}
        </Button>
        <Button
          variant="plain-muted"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
