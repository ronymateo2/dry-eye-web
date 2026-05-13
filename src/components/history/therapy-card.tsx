import { HeartbeatIcon } from "@phosphor-icons/react";
import type { DisplayTherapy } from "./types";
import { formatTime } from "./utils";

export function TherapyCard({ item, timezone }: { item: DisplayTherapy; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  return (
    <article className="flex items-start gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent-dim)]">
        <HeartbeatIcon size={16} color="var(--accent)" weight="fill" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium text-[var(--text-primary)]">
          {item.therapyType === "miofascial" ? "Terapia miofascial" : "Terapia"}
        </span>
        <span className="mono text-[12px] font-normal text-[var(--text-faint)]">{time}</span>
        {item.notes && (
          <span className="mt-1 text-[13px] italic text-[var(--text-muted)]">"{item.notes}"</span>
        )}
      </div>
    </article>
  );
}