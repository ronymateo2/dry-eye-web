import { useState, useEffect } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import type { DisplayCheckIn } from "./types";
import type { ScoreField } from "./types";
import { PRIMARY_FIELDS, PERIPHERAL_FIELDS, ALL_SCORE_FIELDS, TRIGGER_LABELS } from "./types";
import { formatTime, getTimeOfDay, painColor } from "./utils";

function PrimaryRow({ field, value, barsReady }: { field: ScoreField; value: number; barsReady: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-[68px] shrink-0 items-center gap-2">
        <img
          src={field.img}
          alt={field.label}
          className="w-[22px] h-[22px] shrink-0 object-contain theme-invert"
        />
        <span className="text-[12px] font-medium leading-none text-[var(--text-muted)]">
          {field.label}
        </span>
      </div>
      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--surface-el)]">
        <div
          className="h-full rounded-full"
          style={{
            width: barsReady ? `${value * 10}%` : "0%",
            background: painColor(value),
            transition: `width 650ms cubic-bezier(0.25, 1, 0.5, 1) 150ms`,
          }}
        />
      </div>
      <span
        className="mono w-[34px] text-right text-[12px] font-semibold tabular-nums"
        style={{ color: value === 0 ? "var(--text-faint)" : painColor(value) }}
      >
        {value}
        <span className="text-[11px] font-normal opacity-60">/10</span>
      </span>
    </div>
  );
}

function PeripheralChip({ field, value }: { field: ScoreField; value: number }) {
  const color = value === 0 ? "var(--text-faint)" : painColor(value);
  return (
    <div className="flex flex-1 items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface-el)] px-2.5 py-1.5">
      <img
        src={field.img}
        alt={field.label}
        className="w-[18px] h-[18px] shrink-0 object-contain theme-invert"
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-muted)]">
        {field.label}
      </span>
      <span className="mono shrink-0 text-[12px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function CheckInCard({ item, timezone }: { item: DisplayCheckIn; timezone: string }) {
  const { label, isMoon } = getTimeOfDay(item.loggedAt, timezone);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setBarsReady(true), 100);
    return () => clearTimeout(id);
  }, []);

  const worstField = ALL_SCORE_FIELDS.reduce((best, field) =>
    (item[field.key] as number) > (item[best.key] as number) ? field : best,
    ALL_SCORE_FIELDS[0],
  );
  const worstScore = item[worstField.key] as number;
  const worstColor = painColor(worstScore);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-3.5 pb-3.5">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)]">
            {isMoon ? <MoonIcon size={15} color="var(--accent)" /> : <SunIcon size={15} color="var(--accent)" />}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {item.triggerTypes && item.triggerTypes.length > 0
                ? item.triggerTypes.length === 1
                  ? `Trigger: ${item.triggerTypes[0] === "other" && item.notes ? item.notes : TRIGGER_LABELS[item.triggerTypes[0] as keyof typeof TRIGGER_LABELS] ?? item.triggerTypes[0]}`
                  : `Triggers (${item.triggerTypes.length})`
                : item.triggerType
                  ? `Trigger: ${item.triggerType === "other" && item.notes ? item.notes : TRIGGER_LABELS[item.triggerType]}`
                  : label}
            </p>
            <p className="mono text-[11px] text-[var(--text-muted)]">{formatTime(item.loggedAt, timezone)}</p>
            {item.triggerTypes && item.triggerTypes.length > 1 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.triggerTypes.map((t) => (
                  <span key={t} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-faint)]">
                    {TRIGGER_LABELS[t as keyof typeof TRIGGER_LABELS] ?? t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5"
          style={{ background: `color-mix(in srgb, ${worstColor} 12%, transparent)` }}
        >
          <img
            src={worstField.img}
            alt={worstField.label}
            className="w-[20px] h-[20px] object-contain theme-invert"
          />
          <span className="mono text-[15px] font-semibold tabular-nums" style={{ color: worstColor }}>
            {worstScore}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Zona ocular
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="space-y-1.5">
          {PRIMARY_FIELDS.map((field) => (
            <PrimaryRow
              key={field.key}
              field={field}
              value={item[field.key] as number}
              barsReady={barsReady}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Asociado
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="flex gap-2">
          {PERIPHERAL_FIELDS.map((field) => (
            <PeripheralChip
              key={field.key}
              field={field}
              value={item[field.key] as number}
            />
          ))}
        </div>
      </div>

      {item.painQuality && item.painQuality.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {item.painQuality.map((q) => (
              <span
                key={q}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}