import { LightningIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { DisplayTriggerGroup } from "./types";
import { TRIGGER_LABELS } from "./types";
import { formatTime, intensityColor } from "./utils";

export function TriggerCard({ item, timezone }: { item: DisplayTriggerGroup; timezone: string }) {
  const single = item.triggers.length === 1 ? item.triggers[0] : null;
  const maxIntensity = Math.max(...item.triggers.map((t) => t.intensity)) as 1 | 2 | 3;
  const iconColor = intensityColor(maxIntensity);
  const time = formatTime(item.loggedAt, timezone);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {single ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
            >
              <LightningIcon size={15} style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
                {TRIGGER_LABELS[single.triggerType]}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Intensidad {single.intensity} · {time}
              </p>
            </div>
          </div>
          <CaretRightIcon size={14} color="var(--text-faint)" />
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}
              >
                <LightningIcon size={15} style={{ color: iconColor }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">Triggers</p>
                <p className="mono text-[10px] text-[var(--text-muted)]">{time}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1 pl-[42px]">
            {item.triggers.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text-primary)]">{TRIGGER_LABELS[t.triggerType]}</span>
                <span
                  className="text-[10px] font-medium uppercase tracking-[0.1em]"
                  style={{ color: intensityColor(t.intensity) }}
                >
                  Int. {t.intensity}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}