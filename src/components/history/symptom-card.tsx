import { PulseIcon } from "@phosphor-icons/react";
import { SYMPTOM_OPTIONS } from "@/lib/constants";
import type { DisplaySymptomGroup } from "./types";
import { formatTime } from "./utils";

export function SymptomCard({ item, timezone }: { item: DisplaySymptomGroup; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
          <PulseIcon size={15} color="var(--text-muted)" />
        </div>
        <div>
          <p className="text-[15px] font-medium text-[var(--text-primary)]">Síntomas</p>
          <p className="mono text-[12px] font-normal text-[var(--text-muted)]">{time}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 pl-[42px]">
        {item.symptomTypes.map((type, i) => {
          const label = SYMPTOM_OPTIONS.find((o) => o.value === type)?.label ?? type;
          return (
            <span key={i} className="text-[13px] text-[var(--text-muted)]">{label}</span>
          );
        })}
      </div>
    </article>
  );
}