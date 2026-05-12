import type { ComponentProps } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type NativeSelectProps = ComponentProps<"select">;

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-[12px] border border-[var(--border)] bg-[var(--surface)]",
          "px-4 py-3 pr-10 text-[14px] text-[var(--text-primary)]",
          "focus:outline-none focus:border-[var(--accent)]",
          "disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDownIcon
        size={14}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
    </div>
  );
}
