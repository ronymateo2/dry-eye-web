import { Button } from "@/components/ui/button";
import { PlusIcon } from "@phosphor-icons/react";

export function EmptyState({
  label,
  description,
  icon,
  onClick,
  buttonLabel,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  buttonLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-dim)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      <Button onClick={onClick} className="h-10 gap-1.5 px-5 text-[13px]">
        <PlusIcon size={14} weight="bold" />
        {buttonLabel}
      </Button>
    </div>
  );
}
