"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const WHEEL_ROW_HEIGHT = 44;
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_PADDING_ROWS = (WHEEL_VISIBLE_ROWS - 1) / 2;
const WHEEL_FADE_HEIGHT = 36;

export type WheelPickerOption = {
  value: string;
  label: string;
  isAction?: boolean;
};

type WheelPickerProps = {
  label?: string;
  options: WheelPickerOption[];
  value: string;
  onChange: (value: string) => void;
};

export function WheelPicker({
  label,
  options,
  value,
  onChange,
}: WheelPickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isInitialized = useRef(false);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    return () => {
      if (scrollStopTimeoutRef.current) {
        clearTimeout(scrollStopTimeoutRef.current);
      }
    };
  }, []);

  // Only re-runs when `value` or `options` change — not on every activeIndex update.
  // activeIndexRef tracks current index without causing the effect to re-fire.
  useEffect(() => {
    const node = wheelRef.current;
    if (!node || options.length === 0) return;

    const targetIndex = Math.max(
      options.findIndex((opt) => opt.value === value),
      0,
    );

    if (!isInitialized.current) {
      isInitialized.current = true;
      node.style.scrollBehavior = "auto";
      node.scrollTo({ top: targetIndex * WHEEL_ROW_HEIGHT, behavior: "auto" });
      node.style.scrollBehavior = "";
      activeIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
      return;
    }

    const targetScrollTop = targetIndex * WHEEL_ROW_HEIGHT;
    if (Math.abs(node.scrollTop - targetScrollTop) > 2) {
      node.scrollTo({
        top: targetScrollTop,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
    if (targetIndex !== activeIndexRef.current) {
      activeIndexRef.current = targetIndex;
      setActiveIndex(targetIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  if (options.length === 0) return null;

  return (
    <div className="relative rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-2 z-10 rounded-[10px]"
        style={{
          height: `${WHEEL_FADE_HEIGHT}px`,
          background:
            "linear-gradient(to bottom, var(--wheel-fade) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-[10px]"
        style={{
          height: `${WHEEL_FADE_HEIGHT}px`,
          background:
            "linear-gradient(to top, var(--wheel-fade) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-1/2 z-20 -translate-y-1/2 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-dim)] motion-safe:transition-[top] motion-safe:duration-100 motion-safe:[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]"
        style={{ height: `${WHEEL_ROW_HEIGHT}px` }}
      />
      <div
        ref={wheelRef}
        aria-label={label}
        className="wheel-picker relative snap-y snap-mandatory overflow-y-auto overscroll-contain bg-transparent"
        role="listbox"
        style={{ height: `${WHEEL_VISIBLE_ROWS * WHEEL_ROW_HEIGHT}px` }}
        onScroll={(event) => {
          const nextIndex = Math.min(
            Math.max(
              Math.round(event.currentTarget.scrollTop / WHEEL_ROW_HEIGHT),
              0,
            ),
            options.length - 1,
          );
          if (nextIndex !== activeIndexRef.current) {
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
          }

          if (scrollStopTimeoutRef.current) {
            clearTimeout(scrollStopTimeoutRef.current);
          }

          scrollStopTimeoutRef.current = setTimeout(() => {
            const finalIndex = Math.min(
              Math.max(
                Math.round(
                  (wheelRef.current?.scrollTop || 0) / WHEEL_ROW_HEIGHT,
                ),
                0,
              ),
              options.length - 1,
            );
            onChange(options[finalIndex].value);
          }, 120);
        }}
      >
        <div
          aria-hidden
          style={{ height: `${WHEEL_PADDING_ROWS * WHEEL_ROW_HEIGHT}px` }}
        />
        {options.map((option, index) => {
          const isSelected = index === activeIndex;
          return (
            <button
              key={option.value}
              aria-selected={isSelected}
              className={cn(
                "block w-full snap-center rounded-[10px] border border-transparent px-4 text-center text-[15px] font-medium transition-[color] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-safe:active:scale-[0.97] motion-safe:active:transition-none",
                option.isAction
                  ? isSelected
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-faint)]"
                  : isSelected
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)]",
              )}
              style={{ height: `${WHEEL_ROW_HEIGHT}px` }}
              role="option"
              type="button"
              onClick={() => {
                const node = wheelRef.current;
                if (node) {
                  node.scrollTo({
                    top: index * WHEEL_ROW_HEIGHT,
                    behavior: prefersReducedMotion() ? "auto" : "smooth",
                  });
                }
                onChange(options[index].value);
              }}
            >
              {option.label}
            </button>
          );
        })}
        <div
          aria-hidden
          style={{ height: `${WHEEL_PADDING_ROWS * WHEEL_ROW_HEIGHT}px` }}
        />
      </div>
    </div>
  );
}
