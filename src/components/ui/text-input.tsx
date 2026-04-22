import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type TextInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const TextInput = forwardRef<HTMLTextAreaElement, TextInputProps>(
  ({ label, className, ...props }, ref) => (
    <div className="space-y-2">
      {label && (
        <label className="block text-[13px] font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition-colors",
          className,
        )}
        rows={3}
        {...props}
      />
    </div>
  ),
);
TextInput.displayName = "TextInput";
