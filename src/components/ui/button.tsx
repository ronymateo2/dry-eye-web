import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "filled" | "tinted" | "tinted-error" | "tinted-warn"
  | "gray" | "plain" | "plain-muted" | "plain-error"
  | "primary"   // alias → filled (backward compat)
  | "subtle"    // alias → gray   (backward compat)
  | "ghost";    // alias → plain  (buttonVariants / calendar)

type Size = "lg" | "default" | "sm" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const VARIANT: Record<string, string> = {
  filled:          "btn-filled",
  primary:         "btn-filled",
  tinted:          "btn-tinted",
  "tinted-error":  "btn-tinted-error",
  "tinted-warn":   "btn-tinted-warn",
  gray:            "btn-gray",
  subtle:          "btn-gray",
  plain:           "btn-plain",
  ghost:           "btn-plain",
  "plain-muted":   "btn-plain-muted",
  "plain-error":   "btn-plain-error",
};

const SIZE: Record<string, string> = {
  lg:      "btn-lg",
  default: "btn-md",
  sm:      "btn-sm",
  icon:    "h-8 w-8 p-0 min-h-0 rounded-[var(--radius-sm)]",
};

export function buttonVariants({ variant }: { variant?: string; size?: string } = {}) {
  return cn("btn btn-sm", VARIANT[variant ?? "gray"] ?? "btn-gray");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "filled", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "btn",
          VARIANT[variant],
          SIZE[size],
          "disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
