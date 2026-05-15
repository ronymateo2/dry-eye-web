import { PulseIcon } from "@phosphor-icons/react";
import { SYMPTOM_OPTIONS } from "@/lib/constants";
import type { DisplaySymptomGroup } from "./types";
import { formatTime } from "./utils";

export function SymptomCard({ item, timezone }: { item: DisplaySymptomGroup; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);

  return (
    <article className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
          <PulseIcon size={13} color="var(--text-muted)" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--text-primary)]">Síntomas</p>
          <p className="mono text-[11px] font-normal text-[var(--text-muted)]">{time}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1 pl-[36px]">
        {item.symptomTypes.map((type, i) => {
          const label = SYMPTOM_OPTIONS.find((o) => o.value === type)?.label ?? type;
          return (
            <span key={i} className="text-[12px] text-[var(--text-muted)]">{label}</span>
          );
        })}
      </div>
    </article>
  );
}