import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  DropIcon,
  EyedropperIcon,
  CaretRightIcon,
  CheckIcon,
  ListIcon,
  CaretDoubleDownIcon,
} from "@phosphor-icons/react";
import type { DisplayDrop } from "./types";
import { EYE_LABELS, EYE_SHORT } from "./types";
import { formatTime, formatGap } from "./utils";
import { TimelineRow, TimelineDot, TimelineGap, CheckBadge } from "./timeline-ui";
import { MobileSheet } from "@/components/layout/mobile-sheet";

/* ─── GPU-friendly expand animation ─────────────────────────────────────── */
const EXPAND_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/* ─── Memoized sub-components ───────────────────────────────────────────── */

const DropGroupItemInner = ({
  name,
  typedDrops,
  timezone,
  expandedType,
  onToggle,
}: {
  name: string;
  typedDrops: DisplayDrop[];
  timezone: string;
  expandedType: string | null;
  onToggle: (name: string) => void;
}) => {
  const last = useMemo(
    () => typedDrops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b)),
    [typedDrops],
  );
  const typeQuantity = useMemo(
    () => typedDrops.reduce((s, d) => s + d.quantity, 0),
    [typedDrops],
  );
  const isExpanded = expandedType === name;

  const handleClick = useCallback(() => onToggle(name), [name, onToggle]);

  return (
    <div key={name}>
      <button
        className="w-full flex items-center gap-3 py-2 text-left transition-transform duration-[120ms] ease-out active:scale-[0.98]"
        onClick={handleClick}
        aria-expanded={isExpanded}
      >
        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
          {name}
        </span>
        <span
          className="mono inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{
            color: "var(--pain-low)",
            background: "color-mix(in srgb, var(--pain-low) 12%, transparent)",
          }}
        >
          {typedDrops.length}×
        </span>
        <span className="mono w-[42px] shrink-0 text-right text-[12px] tabular-nums text-[var(--text-muted)]">
          {formatTime(last.loggedAt, timezone)}
        </span>
        <span className="mono w-[26px] shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
          {EYE_SHORT[last.eye as keyof typeof EYE_SHORT]}
        </span>
        <div
          className="shrink-0 will-change-transform"
          style={{
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <CaretRightIcon size={12} color="var(--text-faint)" />
        </div>
      </button>

      {/* GPU-accelerated: max-height + opacity instead of grid-template-rows */}
      <div
        className="overflow-hidden will-change-[max-height,opacity]"
        style={{
          maxHeight: isExpanded ? 800 : 0,
          opacity: isExpanded ? 1 : 0,
          transition: `max-height 200ms ${EXPAND_EASE}, opacity 180ms ${EXPAND_EASE}`,
        }}
      >
        <div className="rounded-[10px] bg-[var(--surface-el)] px-3 pt-2.5 pb-3 mb-1">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              {typeQuantity} {typeQuantity === 1 ? "gota" : "gotas"}
            </p>
            {typedDrops.length > 1 && (
              <p className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Intervalos
              </p>
            )}
          </div>
          <DropsTimeline drops={typedDrops} timezone={timezone} />
        </div>
      </div>
    </div>
  );
};

const DropGroupItem = memo(DropGroupItemInner);

function DropsTimeline({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const sorted = useMemo(
    () => [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1)),
    [drops],
  );
  const showTimeline = sorted.length > 1;

  if (!showTimeline) {
    const d = sorted[0];
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
          {formatTime(d.loggedAt, timezone)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--text-muted)]">
            {d.quantity} {d.quantity === 1 ? "gota" : "gotas"} ·{" "}
            {EYE_LABELS[d.eye as keyof typeof EYE_LABELS]}
          </span>
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
            <CheckIcon size={9} color="var(--pain-low)" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {sorted.map((d, i) => {
        const next = sorted[i + 1];
        const isLast = i === sorted.length - 1;
        const gap = next ? formatGap(next.loggedAt, d.loggedAt) : null;

        return (
          <div key={d.id}>
            <TimelineRow time={formatTime(d.loggedAt, timezone)}>
              <TimelineDot />
              <div className="flex min-w-0 items-center justify-end gap-2">
                {d.quantity > 1 && (
                  <span className="mono text-[12px] tabular-nums text-[var(--text-muted)]">
                    {d.quantity}×
                  </span>
                )}
                <span className="mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {EYE_SHORT[d.eye as keyof typeof EYE_SHORT]}
                </span>
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
                  <CheckIcon size={9} color="var(--pain-low)" />
                </div>
              </div>
            </TimelineRow>

            {!isLast && (
              <TimelineGap>
                <span className="mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  {gap}
                </span>
              </TimelineGap>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */

export function DropsBlock({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  /* Memoized heavy computations */
  const groups = useMemo(() => {
    const map = new Map<string, DisplayDrop[]>();
    for (const d of drops) {
      if (!map.has(d.name)) map.set(d.name, []);
      map.get(d.name)!.push(d);
    }
    return map;
  }, [drops]);

  const groupEntries = useMemo(() => Array.from(groups.entries()), [groups]);

  const lastDrop = useMemo(
    () => drops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b)),
    [drops],
  );
  const lastTime = useMemo(() => formatTime(lastDrop.loggedAt, timezone), [lastDrop, timezone]);

  const allSorted = useMemo(
    () => [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1)),
    [drops],
  );
  const totalQuantity = useMemo(() => drops.reduce((s, d) => s + d.quantity, 0), [drops]);

  const occurrenceById = useMemo(() => {
    const asc = [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? 1 : -1));
    const counts = new Map<string, number>();
    const map = new Map<string, number>();
    for (const d of asc) {
      const next = (counts.get(d.name) ?? 0) + 1;
      counts.set(d.name, next);
      map.set(d.id, next);
    }
    return map;
  }, [drops]);

  const handleToggle = useCallback((name: string) => {
    setExpandedType((prev) => (prev === name ? null : name));
  }, []);

  /* Scroll hint ─────── ref-based to avoid re-renders of the whole sheet */
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const showScrollHintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAllTimeline || !sentinelEl) return;

    let scrollContainer: HTMLElement | null = sentinelEl.parentElement;
    while (scrollContainer) {
      const style = getComputedStyle(scrollContainer);
      if (/(auto|scroll)/.test(style.overflowY)) break;
      scrollContainer = scrollContainer.parentElement;
    }
    if (!scrollContainer) return;

    const hintEl = showScrollHintRef.current;
    const container = scrollContainer;

    function check() {
      const hasScroll = container.scrollHeight > container.clientHeight;
      const nearBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 16;
      const show = hasScroll && !nearBottom;
      if (hintEl) {
        hintEl.style.opacity = show ? "1" : "0";
      }
    }

    const timer = setTimeout(check, 400);
    container.addEventListener("scroll", check, { passive: true });

    const ro = new ResizeObserver(check);
    ro.observe(container);

    return () => {
      clearTimeout(timer);
      container.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [showAllTimeline, sentinelEl]);

  const openSheet = useCallback(() => setShowAllTimeline(true), []);

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
            >
              <DropIcon size={15} color="var(--accent)" />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
                Gotas
              </p>
              <p className="mono text-[11px] text-[var(--text-muted)]">{lastTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openSheet}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-[120ms] ease-out active:scale-[0.92]"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
              aria-label="Ver línea de tiempo completa"
            >
              <ListIcon size={14} color="var(--accent)" />
            </button>
            <div
              className="flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5"
              style={{ background: "color-mix(in srgb, var(--pain-low) 12%, transparent)" }}
            >
              <EyedropperIcon size={15} color="var(--pain-low)" />
              <span
                className="mono text-[15px] font-semibold tabular-nums"
                style={{ color: "var(--pain-low)" }}
              >
                {drops.length}
              </span>
            </div>
          </div>
        </div>

        <div>
          {groupEntries.map(([name, typedDrops]) => (
            <DropGroupItem
              key={name}
              name={name}
              typedDrops={typedDrops}
              timezone={timezone}
              expandedType={expandedType}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>

      <MobileSheet
        open={showAllTimeline}
        title="Todas las gotas"
        panelClassName="!h-[90dvh]"
        description={`${totalQuantity} ${totalQuantity === 1 ? "gota" : "gotas"} en total`}
        onClose={() => setShowAllTimeline(false)}
      >
        <div className="relative">
          {allSorted.map((d, i) => {
            const next = allSorted[i + 1];
            const isLast = i === allSorted.length - 1;
            const gap = next ? formatGap(next.loggedAt, d.loggedAt) : null;

            return (
              <div key={d.id}>
                <TimelineRow time={formatTime(d.loggedAt, timezone)}>
                  <TimelineDot color="var(--accent)" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                      {d.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className="mono inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] px-1 text-[11px] font-bold tracking-wider text-[var(--text-faint)]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--surface-el) 60%, transparent)",
                        }}
                      >
                        {occurrenceById.get(d.id)}×
                      </span>
                      <span className="mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                        {EYE_SHORT[d.eye as keyof typeof EYE_SHORT]}
                      </span>
                      <CheckBadge />
                    </div>
                  </div>
                </TimelineRow>
                {!isLast && (
                  <TimelineGap>
                    <span className="mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      {gap}
                    </span>
                  </TimelineGap>
                )}
              </div>
            );
          })}
          {allSorted.length === 0 && (
            <p className="text-[13px] text-[var(--text-muted)]">Sin registros de gotas.</p>
          )}
          <div ref={setSentinelEl} className="h-px" />
        </div>

        {/* Scroll hint — DOM mutation instead of React state to avoid re-renders */}
        <div
          ref={showScrollHintRef}
          className="sticky bottom-0 pointer-events-none flex justify-center pb-3 pt-2 transition-opacity duration-300"
          style={{
            opacity: 0,
            background: "linear-gradient(to top, var(--surface), transparent 35%)",
          }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full shadow-sm"
            style={{ background: "color-mix(in srgb, var(--surface-el) 80%, transparent)" }}
          >
            <CaretDoubleDownIcon
              size={14}
              className="animate-bounce"
              color="var(--text-muted)"
            />
          </div>
        </div>
      </MobileSheet>
    </>
  );
}
