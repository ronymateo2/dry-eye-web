import { useState } from "react";
import { EyeIcon, CheckIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { HygieneRecord } from "@/types/domain";
import { HYGIENE_STATUS_LABELS, HYGIENE_STATUS_COLORS, FRICTION_LABELS } from "./types";
import { formatTime, formatGap } from "./utils";
import { TimelineRow, TimelineDot, TimelineGap } from "./timeline-ui";

function HygieneTimeline({
  sessions,
  timezone,
  statusColor,
}: {
  sessions: { id: string; loggedAt: string }[];
  timezone: string;
  statusColor: string;
}) {
  const sorted = [...sessions].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1));

  return (
    <div className="relative">
      {sorted.map((s, i) => {
        const next = sorted[i + 1];
        const isLast = i === sorted.length - 1;
        const gap = next ? formatGap(next.loggedAt, s.loggedAt) : null;

        return (
          <div key={s.id}>
            <TimelineRow time={formatTime(s.loggedAt, timezone)}>
              <TimelineDot color={statusColor} />
              <div className="flex items-center justify-end">
                <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${statusColor} 15%, transparent)` }}>
                  <CheckIcon size={9} color={statusColor} weight="bold" />
                </div>
              </div>
            </TimelineRow>

            {!isLast && (
              <TimelineGap lineColor={statusColor}>
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

export function HygieneCard({
  item,
  timezone,
}: {
  item: HygieneRecord;
  timezone: string;
}) {
  const statusColor = HYGIENE_STATUS_COLORS[item.status];
  const statusLabel = HYGIENE_STATUS_LABELS[item.status];
  const friction =
    item.frictionType && item.frictionType !== "none"
      ? FRICTION_LABELS[item.frictionType]
      : null;
  const lastTime = item.loggedAt ? formatTime(item.loggedAt, timezone) : null;
  const sessions = item.sessions ?? [];
  const showTimeline = sessions.length > 1;
  const [timelineOpen, setTimelineOpen] = useState(false);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)` }}
          >
            <EyeIcon size={15} style={{ color: statusColor }} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              Higiene palpebral
            </p>
            {lastTime ? (
              <p className="mono text-[11px] text-[var(--text-muted)]">
                {item.completedCount > 1 ? `Última ${lastTime}` : lastTime}
              </p>
            ) : (
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: statusColor }}
              >
                {statusLabel}
              </p>
            )}
          </div>
        </div>

        {item.completedCount > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5"
              style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)` }}
            >
              <CheckIcon size={13} color={statusColor} weight="bold" />
              <span
                className="mono text-[15px] font-semibold tabular-nums"
                style={{ color: statusColor }}
              >
                {item.completedCount}
                <span className="text-[11px] font-normal opacity-70">×</span>
              </span>
            </div>
            {showTimeline && (
              <button
                onClick={() => setTimelineOpen((o) => !o)}
                aria-expanded={timelineOpen}
                aria-label="Ver sesiones"
                className="transition-transform duration-[120ms] ease-out active:scale-[0.80]"
              >
                <CaretRightIcon
                  size={13}
                  style={{ color: `color-mix(in srgb, ${statusColor} 45%, var(--text-faint))`, transform: timelineOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                />
              </button>
            )}
          </div>
        ) : (
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {showTimeline && (
        <div
          style={{
            display: "grid",
            gridTemplateRows: timelineOpen ? "1fr" : "0fr",
            transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="overflow-hidden">
            <div className="mt-2.5 rounded-[10px] bg-[var(--surface-el)] px-3 pt-2.5 pb-3">
              <p className="mono mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Sesiones
              </p>
              <HygieneTimeline sessions={sessions} timezone={timezone} statusColor={statusColor} />
            </div>
          </div>
        </div>
      )}

      {(friction || item.userNote) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--border)] pt-2.5">
          {friction && (
            <span
              className="self-start rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: "var(--accent)",
                borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                background: "var(--accent-dim)",
              }}
            >
              {friction}
            </span>
          )}
          {item.userNote && (
            <p className="text-[12px] italic leading-snug text-[var(--text-muted)]">
              "{item.userNote}"
            </p>
          )}
        </div>
      )}
    </article>
  );
}