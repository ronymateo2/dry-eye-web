import { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Animated circular icon button.
 *
 * Variants (aligned with Button design system):
 *   filled        — solid accent bg, for prominent CTAs (use sparingly)
 *   tinted        — 15% accent bg, default icon action
 *   tinted-error  — delete / destructive
 *   tinted-warn   — warning action
 *   tinted-success— confirm / registered state
 *   muted         — secondary / inactive
 *   ghost         — no background, minimal
 *
 * Sizes: sm (h-7), md (h-8, default), lg (h-10)
 *
 * - Always pass aria-label (no visible text).
 * - Icon inherits color from button — don't set color on the icon.
 * - Override whileTap / whileHover via props when needed.
 *
 * @example
 * <IconButton onClick={handleLog} aria-label="Registrar dosis">
 *   <DropIcon size={14} />
 * </IconButton>
 *
 * <IconButton variant="tinted-error" onClick={handleDelete} aria-label="Eliminar">
 *   <TrashIcon size={14} />
 * </IconButton>
 */
type Variant = "filled" | "tinted" | "tinted-error" | "tinted-warn" | "tinted-success" | "muted" | "ghost";
type Size = "sm" | "md" | "lg";

type IconButtonProps = ComponentProps<typeof motion.button> & {
  variant?: Variant;
  size?: Size;
};

const VARIANT_STYLES: Record<Variant, { color: string; bg: string }> = {
  filled: { color: "var(--bg)", bg: "var(--accent)" },
  tinted: { color: "var(--accent)", bg: "color-mix(in srgb, var(--accent) 15%, transparent)" },
  "tinted-error": { color: "var(--pain-high)", bg: "color-mix(in srgb, var(--pain-high) 15%, transparent)" },
  "tinted-warn": { color: "var(--pain-mid)", bg: "color-mix(in srgb, var(--pain-mid) 15%, transparent)" },
  "tinted-success": { color: "var(--pain-low)", bg: "color-mix(in srgb, var(--pain-low) 15%, transparent)" },
  muted: { color: "var(--text-faint)", bg: "color-mix(in srgb, var(--text-faint) 10%, transparent)" },
  ghost: { color: "var(--text-muted)", bg: "transparent" },
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "tinted", size = "md", style, ...props }, ref) => {
    const { color, bg } = VARIANT_STYLES[variant];

    return (
      <motion.button
        ref={ref}
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 1.3 }}
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          SIZE_CLASS[size],
          className,
        )}
        style={{ background: bg, color, ...style }}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
