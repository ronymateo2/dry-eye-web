import { useState } from "react";
import { DropIcon, EyedropperIcon, CaretRightIcon, CheckIcon, ListIcon } from "@phosphor-icons/react";
import type { DisplayDrop } from "./types";
import { EYE_LABELS, EYE_SHORT } from "./types";
import { formatTime, formatGap } from "./utils";
import { TimelineRow, TimelineDot, TimelineGap, CheckBadge } from "./timeline-ui";
import { MobileSheet } from "@/components/layout/mobile-sheet";

function DropsTimeline({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const sorted = [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1));
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
            {d.quantity} {d.quantity === 1 ? "gota" : "gotas"} · {EYE_LABELS[d.eye as keyof typeof EYE_LABELS]}
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
                <span className="mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
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

export function DropsBlock({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  const groups = new Map<string, DisplayDrop[]>();
  for (const d of drops) {
    if (!groups.has(d.name)) groups.set(d.name, []);
    groups.get(d.name)!.push(d);
  }

  const groupEntries = Array.from(groups.entries());
  const lastDrop = drops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
  const lastTime = formatTime(lastDrop.loggedAt, timezone);

  const allSorted = [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1));
  const totalQuantity = drops.reduce((s, d) => s + d.quantity, 0);

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
              onClick={() => setShowAllTimeline(true)}
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
              <span className="mono text-[15px] font-semibold tabular-nums" style={{ color: "var(--pain-low)" }}>
                {drops.length}
              </span>
            </div>
          </div>
        </div>

        <div>
          {groupEntries.map(([name, typedDrops]) => {
            const last = typedDrops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
            const isExpanded = expandedType === name;
            const typeQuantity = typedDrops.reduce((s, d) => s + d.quantity, 0);

            return (
              <div key={name}>
                <button
                  className="w-full flex items-center gap-3 py-2 text-left transition-transform duration-[120ms] ease-out active:scale-[0.98]"
                  onClick={() => setExpandedType(isExpanded ? null : name)}
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
                  <span className="mono w-[26px] shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                    {EYE_SHORT[last.eye as keyof typeof EYE_SHORT]}
                  </span>
                  <div
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                  >
                    <CaretRightIcon size={12} color="var(--text-faint)" />
                  </div>
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="rounded-[10px] bg-[var(--surface-el)] px-3 pt-2.5 pb-3 mb-1">
                      <div className="mb-2 flex items-baseline justify-between">
                        <p className="mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                          {typeQuantity} {typeQuantity === 1 ? "gota" : "gotas"}
                        </p>
                        {typedDrops.length > 1 && (
                          <p className="mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                            Intervalos
                          </p>
                        )}
                      </div>
                      <DropsTimeline drops={typedDrops} timezone={timezone} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate text-[13px] text-[var(--text-primary)]">
                      {d.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-[var(--text-muted)]">
                      {d.quantity}
                    </span>
                    <span className="mono shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {EYE_SHORT[d.eye as keyof typeof EYE_SHORT]}
                    </span>
                    <CheckBadge />
                  </div>
                </TimelineRow>
                {!isLast && (
                  <TimelineGap>
                    <span className="mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-faint)]">
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
        </div>
      </MobileSheet>
    </>
  );
}