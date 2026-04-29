import { CaretRightIcon } from "@phosphor-icons/react";
import type { HistoryFeed, HygieneRecord } from "@/types/domain";
import type { DisplayItem } from "./types";
import {
  collapseEntries,
  getDotColor,
  formatShortDate,
  getDayPillLabel,
} from "./utils";
import { CollapsedDaySummary } from "./collapsed-day-summary";
import { HistoryItem } from "./history-item";

interface HistoryListProps {
  feed: HistoryFeed;
  timezone: string;
  expandedDays: Set<string>;
  toggleDay: (dayKey: string) => void;
}

export function HistoryList({ feed, timezone, expandedDays, toggleDay }: HistoryListProps) {
  const hygieneByDay = new Map<string, HygieneRecord>();
  for (const row of feed.hygiene) hygieneByDay.set(row.dayKey, row);

  return (
    <div className="space-y-3">
      {feed.groups.map((group) => {
        const isExpanded = expandedDays.has(group.dayKey);

        if (!isExpanded) {
          return (
            <CollapsedDaySummary
              key={group.dayKey}
              group={group}
              timezone={timezone}
              onExpand={() => toggleDay(group.dayKey)}
            />
          );
        }

        const collapsed = collapseEntries(group.entries);
        const hyg = hygieneByDay.get(group.dayKey);
        const allItems: DisplayItem[] = hyg
          ? [...collapsed, { kind: "hygiene", id: group.dayKey, loggedAt: hyg.loggedAt, record: hyg }]
          : collapsed;
        allItems.sort((a, b) => (b.loggedAt > a.loggedAt ? 1 : -1));
        const pillLabel = getDayPillLabel(group.dayKey, timezone);
        const shortDate = formatShortDate(group.dayKey);

        return (
          <div key={group.dayKey} className="space-y-3">
            {/* Collapsible day header */}
            <div className="flex items-center gap-2 py-1">
              <button
                onClick={() => toggleDay(group.dayKey)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-3 text-[10px] font-semibold tracking-[0.12em] text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--border)]"
              >
                <span>{pillLabel ?? shortDate}</span>
                <div style={{ transform: "rotate(90deg)" }}>
                  <CaretRightIcon size={9} color="var(--text-faint)" />
                </div>
              </button>
              {pillLabel && (
                <span className="text-[11px] font-medium tracking-[0.1em] text-[var(--text-muted)]">
                  {shortDate}
                </span>
              )}
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[var(--border)]" />

              <div className="space-y-2.5">
                {allItems.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-3 pl-8">
                    <div
                      className="absolute left-[11px] top-[19px] z-10 h-[9px] w-[9px] rounded-full"
                      style={{ background: getDotColor(item), boxShadow: "0 0 0 2px var(--bg)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <HistoryItem item={item} timezone={timezone} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
