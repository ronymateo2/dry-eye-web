"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: "default" | "quiet";
};

// Split easings — the leading edge uses ease-out (fast start, slow settle)
// and the trailing edge uses ease-in (slow start, fast catch-up). The phase
// difference makes the pill stretch mid-transition, then contract at the end.
const EASE_LEAD = [0.22, 1, 0.36, 1] as const;
const EASE_TRAIL = [0.64, 0, 0.78, 0] as const;
const DURATION = 0.45;
const TEXT_EASING = "cubic-bezier(0, 0, 0.2, 1)";

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "default",
}: SegmentedControlProps<T>) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef(new Map<T, HTMLButtonElement>());
  const prevValueRef = useRef<T>(value);

  const [pill, setPill] = useState<{
    left: number;
    right: number;
    dir: 1 | -1 | 0;
  }>({ left: 0, right: 0, dir: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    const active = buttonsRef.current.get(value);
    if (!container || !active) return;

    const cw = container.offsetWidth;
    const left = active.offsetLeft;
    const right = cw - left - active.offsetWidth;

    const prevIdx = options.findIndex((o) => o.value === prevValueRef.current);
    const nextIdx = options.findIndex((o) => o.value === value);
    const dir: 1 | -1 | 0 = nextIdx > prevIdx ? 1 : nextIdx < prevIdx ? -1 : 0;

    setPill({ left, right, dir });
    prevValueRef.current = value;
  }, [value, options]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  const leftTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: DURATION,
        ease: pill.dir === 1 ? EASE_TRAIL : EASE_LEAD,
      };
  const rightTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: DURATION,
        ease: pill.dir === 1 ? EASE_LEAD : EASE_TRAIL,
      };

  const isQuiet = tone === "quiet";

  return (
    <div className="space-y-3">
      <p className="section-label">{label}</p>
      <div
        ref={containerRef}
        className={cn(
          "relative grid min-h-12",
          isQuiet && "rounded-full",
        )}
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        <motion.div
          aria-hidden
          initial={false}
          animate={{ left: pill.left, right: pill.right }}
          transition={{ left: leftTransition, right: rightTransition }}
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 rounded-full",
            isQuiet ? "bg-[var(--accent-dim)]" : "bg-[var(--accent)]",
          )}
        />

        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              ref={(el) => {
                if (el) buttonsRef.current.set(option.value, el);
                else buttonsRef.current.delete(option.value);
              }}
              type="button"
              onClick={() => onChange(option.value)}
              onPointerDown={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              className={cn(
                "relative z-10 flex min-h-12 select-none items-center justify-center px-4 text-[13px]",
                isActive ? "font-semibold" : "font-medium",
                isActive && !isQuiet && "text-[var(--btn-primary-text)]",
                isActive && isQuiet && "text-[var(--accent)]",
                !isActive && "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
              style={{ transition: `color 220ms ${TEXT_EASING}` }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
