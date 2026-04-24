import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_SLEEP_HOURS = 0;
const MAX_SLEEP_HOURS = 12;
const DEFAULT_SLEEP_HOURS = 6;
const STEP_SLEEP_HOURS = 0.5;
const WHEEL_ROW_HEIGHT = 56;
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_PADDING_ROWS = (WHEEL_VISIBLE_ROWS - 1) / 2;
const WHEEL_FADE_HEIGHT = 88;
const WHEEL_CYCLE_DUPLICATES = 7;

type SleepHoursInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

function formatHours(value: number) {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

function clampAndRoundHours(value: number) {
  const clamped = Math.min(MAX_SLEEP_HOURS, Math.max(MIN_SLEEP_HOURS, value));
  return Math.round((Math.round(clamped / STEP_SLEEP_HOURS) * STEP_SLEEP_HOURS) * 10) / 10;
}

function parseHours(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return clampAndRoundHours(parsed);
}

function buildWheelOptions() {
  const options: number[] = [];
  const count = Math.round((MAX_SLEEP_HOURS - MIN_SLEEP_HOURS) / STEP_SLEEP_HOURS);
  for (let index = 0; index <= count; index += 1) {
    options.push(MIN_SLEEP_HOURS + index * STEP_SLEEP_HOURS);
  }
  return options;
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), length - 1);
}

function normalizeIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function SleepHoursInput({ id = "sleep-hours", label = "Horas de sueno", value, onChange }: SleepHoursInputProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coreOptions = useMemo(buildWheelOptions, []);
  const cycleSize = coreOptions.length;
  const middleCycleStart = cycleSize * Math.floor(WHEEL_CYCLE_DUPLICATES / 2);
  const wheelOptions = useMemo(
    () =>
      Array.from({ length: WHEEL_CYCLE_DUPLICATES }, (_, cycle) =>
        coreOptions.map((option) => ({ key: `${cycle}-${option}`, value: option }))
      ).flat(),
    [coreOptions],
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const parsedValue = parseHours(value);
  const effectiveValue = parsedValue ?? DEFAULT_SLEEP_HOURS;

  const selectedCoreIndex = useMemo(() => {
    const rawIndex = Math.round((effectiveValue - MIN_SLEEP_HOURS) / STEP_SLEEP_HOURS);
    return clampIndex(rawIndex, cycleSize);
  }, [cycleSize, effectiveValue]);

  const selectedIndex = middleCycleStart + selectedCoreIndex;
  const activeIndex = previewIndex ?? selectedIndex;
  const activeCoreIndex = normalizeIndex(activeIndex, cycleSize);

  const commitCoreIndex = (coreIndex: number) => {
    const nextValue = coreOptions[normalizeIndex(coreIndex, cycleSize)];
    onChange(formatHours(nextValue));
  };

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;
    const nextScrollTop = selectedIndex * WHEEL_ROW_HEIGHT;
    if (Math.abs(node.scrollTop - nextScrollTop) < 2) return;
    node.scrollTo({ top: nextScrollTop, behavior: "auto" });
  }, [selectedIndex]);

  useEffect(() => {
    return () => {
      if (scrollStopTimeoutRef.current) clearTimeout(scrollStopTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[13px] font-medium text-[var(--text-primary)]">{label}</p>
        <span className="mono text-[22px] font-normal text-[var(--accent)]">
          {`${formatHours(coreOptions[activeCoreIndex])} h`}
        </span>
      </div>

      <div className="relative rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-2">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-2 z-10 rounded-[10px]"
          style={{
            height: `${WHEEL_FADE_HEIGHT}px`,
            background: "linear-gradient(to bottom, var(--wheel-fade) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-[10px]"
          style={{
            height: `${WHEEL_FADE_HEIGHT}px`,
            background: "linear-gradient(to top, var(--wheel-fade) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-1/2 z-20 -translate-y-1/2 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-dim)]"
          style={{ height: `${WHEEL_ROW_HEIGHT}px` }}
        />
        <div
          id={id}
          ref={wheelRef}
          aria-label={label}
          className="wheel-picker relative snap-y snap-mandatory overflow-y-auto overscroll-contain"
          role="listbox"
          style={{ height: `${WHEEL_VISIBLE_ROWS * WHEEL_ROW_HEIGHT}px` }}
          onScroll={(event) => {
            const nextIndex = clampIndex(
              Math.round(event.currentTarget.scrollTop / WHEEL_ROW_HEIGHT),
              wheelOptions.length,
            );
            setPreviewIndex(nextIndex);

            if (scrollStopTimeoutRef.current) clearTimeout(scrollStopTimeoutRef.current);

            scrollStopTimeoutRef.current = setTimeout(() => {
              const nextCoreIndex = normalizeIndex(nextIndex, cycleSize);
              const recenteredIndex = middleCycleStart + nextCoreIndex;

              setPreviewIndex(null);
              commitCoreIndex(nextCoreIndex);

              const node = wheelRef.current;
              if (node) node.scrollTo({ top: recenteredIndex * WHEEL_ROW_HEIGHT, behavior: "auto" });
            }, 120);
          }}
        >
          <div aria-hidden style={{ height: `${WHEEL_PADDING_ROWS * WHEEL_ROW_HEIGHT}px` }} />
          {wheelOptions.map((item, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={item.key}
                aria-selected={isSelected}
                className={cn(
                  "mono block h-14 w-full snap-center rounded-[10px] border border-transparent px-4 text-center text-[17px] transition-colors",
                  isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                )}
                role="option"
                type="button"
                onClick={() => {
                  const nextCoreIndex = normalizeIndex(index, cycleSize);
                  const recenteredIndex = middleCycleStart + nextCoreIndex;
                  const node = wheelRef.current;
                  if (node) node.scrollTo({ top: recenteredIndex * WHEEL_ROW_HEIGHT, behavior: "smooth" });
                  commitCoreIndex(nextCoreIndex);
                }}
              >
                {`${formatHours(item.value)} h`}
              </button>
            );
          })}
          <div aria-hidden style={{ height: `${WHEEL_PADDING_ROWS * WHEEL_ROW_HEIGHT}px` }} />
        </div>
      </div>

      <p className="m-0 text-[12px] text-[var(--text-muted)]">Desliza para elegir entre 0 y 12 horas.</p>
    </div>
  );
}
