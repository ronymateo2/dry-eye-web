import { TrashIcon, PlusIcon } from "@phosphor-icons/react";

export function sortTimes(arr: string[]): string[] {
  return [...arr].sort();
}

export function TimesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const sorted = sortTimes(value);

  const handleAddSlot = () => onChange(sortTimes([...sorted, "08:00"]));

  const handleUpdateSlot = (i: number, next: string) => {
    const arr = [...sorted];
    arr[i] = next;
    onChange(sortTimes(arr));
  };

  const handleRemoveSlot = (i: number) => {
    onChange(sorted.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-1.5">
      {sorted.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="time"
            value={t}
            onChange={(e) => handleUpdateSlot(i, e.target.value)}
            className="flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            aria-label="Eliminar hora"
            onClick={() => handleRemoveSlot(i)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--error)] opacity-60 hover:opacity-100 transition-opacity"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddSlot}
        className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--border)] py-2 text-[13px] text-[var(--text-faint)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        <PlusIcon size={12} weight="bold" />
        Agregar hora
      </button>
    </div>
  );
}

export function parseTimesJson(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && /^\d{2}:\d{2}$/.test(t));
  } catch {
    return [];
  }
}
