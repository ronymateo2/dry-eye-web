import { CaretRightIcon } from "@phosphor-icons/react";
import type { HistoryDayGroup } from "@/types/domain";
import { formatTime, formatShortDate, getDayPillLabel } from "./utils";

interface CollapsedDaySummaryProps {
  group: HistoryDayGroup;
  timezone: string;
  onExpand: () => void;
}

export function CollapsedDaySummary({ group, timezone, onExpand }: CollapsedDaySummaryProps) {
  let dropCount = 0;
  let checkCount = 0;
  let otherCount = 0;
  let lastAt = "";

  for (const e of group.entries) {
    if (e.kind === "drop") dropCount++;
    else if (e.kind === "check_in") checkCount++;
    else otherCount++;
    if (!lastAt || e.loggedAt > lastAt) lastAt = e.loggedAt;
  }

  const pillLabel = getDayPillLabel(group.dayKey, timezone);
  const shortDate = formatShortDate(group.dayKey);

  const parts: string[] = [];
  if (checkCount > 0) parts.push(`${checkCount} check${checkCount > 1 ? "s" : ""}`);
  if (dropCount > 0) parts.push(`${dropCount} gota${dropCount !== 1 ? "s" : ""}`);
  if (otherCount > 0) parts.push(`+${otherCount}`);

  return (
    <button
      onClick={onExpand}
      className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition duration-150 ease-out hover:bg-[var(--surface-el)] active:scale-[0.97]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{shortDate}</span>
            {pillLabel && (
              <span className="text-[10px] font-semibold tracking-[0.1em]" style={{ color: "var(--accent)" }}>
                {pillLabel}
              </span>
            )}
          </div>
          {parts.length > 0 && (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{parts.join(" · ")}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastAt && (
            <span className="mono text-[10px] text-[var(--text-faint)]">
              ult {formatTime(lastAt, timezone)}
            </span>
          )}
          <CaretRightIcon size={14} color="var(--text-faint)" />
        </div>
      </div>
    </button>
  );
}
