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
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 min-h-[40px] rounded-[8px] bg-[var(--error)] text-[13px] font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Archivando..." : "Archivar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[40px] rounded-[8px] border border-[var(--border)] text-[13px] font-medium text-[var(--text-muted)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
