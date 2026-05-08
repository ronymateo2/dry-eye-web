import { Button } from "@/components/ui/button";
import { PlusIcon } from "@phosphor-icons/react";

export function PanelHeader({
  title,
  count,
  onAdd,
  addLabel,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-tight text-[var(--text-primary)]">{title}</h2>
        {count > 0 && (
          <p className="mono mt-0.5 text-[12px] text-[var(--text-faint)]">
            {count} {count === 1 ? "activa" : "activas"}
          </p>
        )}
      </div>
      <Button
        type="button"
        onClick={onAdd}
        className="h-9 shrink-0 gap-1.5 px-3.5 text-[13px]"
      >
        <PlusIcon size={12} weight="bold" />
        {addLabel}
      </Button>
    </div>
  );
}
