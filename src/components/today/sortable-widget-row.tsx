import { type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { TodayWidgetDef, TodayWidgetEntry, TodayWidgetId } from "./widget-registry";

type Props = {
  entry: TodayWidgetEntry;
  def: TodayWidgetDef;
  onToggle: (id: TodayWidgetId) => void;
};

export function SortableWidgetRow({ entry, def, onToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const Icon = def.icon;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-[52px] items-center gap-3 border-b border-[var(--border)] px-4 last:border-b-0",
        "bg-[var(--surface-card)] transition-opacity",
        isDragging && "shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
        !entry.visible && "opacity-40",
      )}
    >
      <button
        type="button"
        aria-label={`Arrastrar ${def.label}`}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--text-faint)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon size={18} />
      </button>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
        <Icon size={15} color="var(--accent)" weight="fill" />
      </div>

      <span
        className={cn(
          "flex-1 truncate text-[14px]",
          entry.visible ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
        )}
      >
        {def.label}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={entry.visible}
        aria-label={`${entry.visible ? "Ocultar" : "Mostrar"} ${def.label}`}
        onClick={() => onToggle(entry.id)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--text-faint)] transition-colors hover:text-[var(--accent)]"
      >
        {entry.visible ? <EyeIcon size={17} /> : <EyeSlashIcon size={17} />}
      </button>
    </li>
  );
}
