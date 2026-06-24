import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { TodayWidgetId } from "./widget-config";

type Props = {
  id: TodayWidgetId;
  label: string;
  visible: boolean;
  onToggle: (id: TodayWidgetId) => void;
  children: ReactNode;
};

export function SortableWidgetCard({ id, label, visible, onToggle, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const base = CSS.Transform.toString(transform);
  const style: CSSProperties = {
    transform: isDragging ? `${base ?? ""} scale(1.02)` : base,
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative touch-none rounded-[16px]",
        !isDragging && "widget-jiggle",
        isDragging && "shadow-[0_8px_28px_rgba(0,0,0,0.42)]",
        !visible && "opacity-50",
      )}
      {...attributes}
      {...listeners}
      aria-label={`Reordenar ${label}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onToggle(id)}
        className={cn(
          "absolute -top-2 -left-2 z-20 flex h-7 w-7 items-center justify-center rounded-full",
          "border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
          "transition-transform duration-[160ms] ease-out active:scale-[0.9]",
          visible
            ? "bg-[var(--accent)] text-[var(--bg)]"
            : "bg-[var(--surface-el)] text-[var(--text-muted)]",
        )}
      >
        {visible ? <EyeSlashIcon size={14} weight="bold" /> : <EyeIcon size={14} weight="bold" />}
      </button>

      <div className="pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
