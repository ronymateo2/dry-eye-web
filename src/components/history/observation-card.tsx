import { NotePencilIcon } from "@phosphor-icons/react";
import { OBS_EYE_LABELS } from "@/lib/constants";
import type { DisplayObservation } from "./types";
import { formatTime, painColor } from "./utils";

export function ObservationCard({ item, timezone }: { item: DisplayObservation; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const eyeLabel = OBS_EYE_LABELS[item.eye as keyof typeof OBS_EYE_LABELS];
  const intensityHue = painColor(item.intensity);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
          <NotePencilIcon size={15} color="var(--text-muted)" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">{item.title}</p>
            <span
              className="mono shrink-0 text-[13px] font-medium tabular-nums"
              style={{ color: intensityHue }}
            >
              {item.intensity}/10
            </span>
          </div>
          <p className="mono mt-0.5 text-[10px] text-[var(--text-muted)]">
            {eyeLabel ? `${eyeLabel} · ` : ""}
            {item.durationMinutes ? `${item.durationMinutes} min · ` : ""}
            {time}
          </p>
          {item.notes ? (
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--text-muted)]">{item.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}