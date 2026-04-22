import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle";
  /** Used internally by shadcn calendar nav buttons */
  size?: "default" | "icon" | "sm" | "lg";
};

// Minimal variant helper used by shadcn calendar component
export function buttonVariants({
  variant,
}: {
  variant?: string;
  size?: string;
} = {}) {
  if (variant === "ghost") {
    return "hover:bg-[var(--surface-el)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] p-0 inline-flex items-center justify-center";
  }
  return "inline-flex items-center justify-center";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex min-h-12 items-center justify-center rounded-[999px] border px-5 py-3 text-[15px] font-medium transition-[color,background-color,border-color,transform] duration-[160ms] ease-out active:scale-[0.97]",
          variant === "primary" &&
            "border-transparent bg-[var(--accent)] text-[#121008] hover:bg-[var(--accent-bright)] disabled:opacity-50",
          variant === "ghost" &&
            "border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-el)] disabled:opacity-50",
          variant === "subtle" &&
            "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-el)] disabled:opacity-50",
          size === "icon" &&
            "min-h-0 h-8 w-8 rounded-[var(--radius-sm)] border-0 p-0 px-0",
          "disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
