import { BedIcon } from "@phosphor-icons/react";
import type { DisplaySleep } from "./types";
import { SLEEP_QUALITY_LABELS, SLEEP_QUALITY_COLORS } from "./types";
import { formatTime } from "./utils";

export function SleepCard({ item, timezone }: { item: DisplaySleep; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const qualityColor = SLEEP_QUALITY_COLORS[item.sleepQuality];

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
            <BedIcon size={15} color="var(--text-muted)" />
          </div>
          <div>
            <p className="text-[17px] font-medium leading-tight text-[var(--text-primary)]">
              Sueño · {item.sleepHours}h
            </p>
            <p className="mono text-[12px] font-normal text-[var(--text-muted)]">{time}</p>
          </div>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.10em]" style={{ color: qualityColor }}>
          {SLEEP_QUALITY_LABELS[item.sleepQuality]}
        </span>
      </div>
    </article>
  );
}