import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cn, daysUntilEnd } from "@/lib/utils";

export type RowBase = { id: string; end_date?: string | null };

export function TreatmentCard({
  item,
  name,
  detail,
  isOnly,
  onClick,
  children,
  icon,
}: {
  item: RowBase;
  name: string;
  detail?: string;
  isOnly: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  icon: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const endDays = item.end_date ? daysUntilEnd(item.end_date) : null;
  const isPastEnd = endDays !== null && endDays < 0;
  const isUrgentEnd = endDays !== null && !isPastEnd && endDays <= 7;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        "border-b border-[var(--border)] last:border-b-0",
        isDragging && "bg-[var(--surface-el)] opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      )}
    >
      <div className="flex min-h-[64px] items-stretch">
        {!isOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reordenar ${name}`}
            className="flex w-12 shrink-0 cursor-grab items-center justify-center text-[var(--text-muted)] active:cursor-grabbing"
          >
            <DotsSixVerticalIcon size={18} />
          </button>
        )}

        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex flex-1 items-center gap-3 px-2 py-3 text-left min-w-0",
            "active:bg-[var(--surface-el)] transition-colors",
            isPastEnd && "opacity-50",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-dim)]">
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  "text-[15px] font-medium text-[var(--text-primary)] leading-snug",
                  isPastEnd && "line-through",
                )}
              >
                {name}
              </span>
              {(isPastEnd || isUrgentEnd) && (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                    isPastEnd
                      ? "bg-[rgba(204,63,48,0.12)] text-[var(--error)]"
                      : "bg-[rgba(234,179,8,0.12)] text-[#ca8a04]",
                  )}
                >
                  {isPastEnd ? "Suspendido" : `Suspender en ${endDays}d`}
                </span>
              )}
            </div>
            {detail && (
              <span className="mono mt-0.5 block text-[12px] text-[var(--text-muted)] leading-tight">
                {detail}
              </span>
            )}
            {children}
          </div>

          <CaretRightIcon size={16} color="var(--text-faint)" className="shrink-0" />
        </button>
      </div>
    </li>
  );
}
