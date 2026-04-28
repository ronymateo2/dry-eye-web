import { useState, useEffect } from "react";
import {
  PulseIcon,
  CheckIcon,
  CaretRightIcon,
  DropIcon,
  EyedropperIcon,
  MoonIcon,
  SunIcon,
  LightningIcon,
  NotePencilIcon,
  BedIcon,
  EyeIcon,
} from "@phosphor-icons/react";
import { SYMPTOM_OPTIONS, OBS_EYE_LABELS } from "@/lib/constants";
import type { HygieneRecord } from "@/types/domain";
import type {
  DisplayCheckIn,
  DisplayDrop,
  DisplayTriggerGroup,
  DisplaySymptomGroup,
  DisplayObservation,
  DisplaySleep,
  ScoreField,
} from "./types";
import {
  TRIGGER_LABELS,
  EYE_LABELS,
  EYE_SHORT,
  SLEEP_QUALITY_LABELS,
  SLEEP_QUALITY_COLORS,
  HYGIENE_STATUS_LABELS,
  HYGIENE_STATUS_COLORS,
  ALL_SCORE_FIELDS,
  PRIMARY_FIELDS,
  PERIPHERAL_FIELDS,
} from "./types";
import {
  formatTime,
  formatGap,
  getTimeOfDay,
  painColor,
  intensityColor,
} from "./utils";

// ─── Drops block ──────────────────────────────────────────────────────────────

function DropsTimeline({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const sorted = [...drops].sort((a, b) => (a.loggedAt > b.loggedAt ? -1 : 1));
  const showTimeline = sorted.length > 1;

  return (
    <div className="relative">
      {sorted.map((d, i) => {
        const next = sorted[i + 1];
        const isLast = i === sorted.length - 1;
        const gap = next ? formatGap(next.loggedAt, d.loggedAt) : null;

        return (
          <div key={d.id}>
            <div
              className={
                showTimeline
                  ? "grid grid-cols-[44px_18px_1fr] items-center gap-2"
                  : "flex items-center justify-between gap-2"
              }
            >
              <span className="mono text-[12px] tabular-nums text-[var(--text-primary)]">
                {formatTime(d.loggedAt, timezone)}
              </span>

              {showTimeline && (
                <div className="relative flex h-6 items-center justify-center">
                  <span
                    className="relative z-10 block h-[7px] w-[7px] rounded-full"
                    style={{
                      background: "var(--accent)",
                      boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <span className="text-[12px] text-[var(--text-muted)]">
                  {d.quantity} {d.quantity === 1 ? "gota" : "gotas"} · {EYE_LABELS[d.eye as keyof typeof EYE_LABELS]}
                </span>
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
                  <CheckIcon size={9} color="var(--pain-low)" />
                </div>
              </div>
            </div>

            {!isLast && (
              <div className="grid grid-cols-[44px_18px_1fr] items-stretch gap-2">
                <span />
                <div className="relative flex min-h-[22px] items-center justify-center">
                  <span
                    className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
                    style={{
                      background:
                        "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--accent) 30%, transparent))",
                    }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center gap-2 py-0.5">
                  <span
                    className="h-px w-3 shrink-0"
                    style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
                    aria-hidden
                  />
                  <span
                    className="mono text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-faint)]"
                  >
                    {gap}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DropsBlock({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const groups = new Map<string, DisplayDrop[]>();
  for (const d of drops) {
    if (!groups.has(d.name)) groups.set(d.name, []);
    groups.get(d.name)!.push(d);
  }

  const groupEntries = Array.from(groups.entries());
  const lastDrop = drops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
  const lastTime = formatTime(lastDrop.loggedAt, timezone);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-3 pb-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
          >
            <DropIcon size={15} color="var(--accent)" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              Gotas
            </p>
            <p className="mono text-[11px] text-[var(--text-muted)]">{lastTime}</p>
          </div>
        </div>
        <div
          className="flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5"
          style={{ background: "color-mix(in srgb, var(--pain-low) 12%, transparent)" }}
        >
          <EyedropperIcon size={15} color="var(--pain-low)" />
          <span className="mono text-[15px] font-semibold tabular-nums" style={{ color: "var(--pain-low)" }}>
            {drops.length}
          </span>
        </div>
      </div>

      <div>
        {groupEntries.map(([name, typedDrops]) => {
          const last = typedDrops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
          const isExpanded = expandedType === name;
          const typeQuantity = typedDrops.reduce((s, d) => s + d.quantity, 0);

          return (
            <div key={name}>
              <button
                className="w-full flex items-center gap-3 py-2 text-left"
                onClick={() => setExpandedType(isExpanded ? null : name)}
                aria-expanded={isExpanded}
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--text-primary)]">
                  {name}
                </span>
                <span
                  className="mono inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    color: "var(--pain-low)",
                    background: "color-mix(in srgb, var(--pain-low) 12%, transparent)",
                  }}
                >
                  {typedDrops.length}×
                </span>
                <span className="mono w-[42px] shrink-0 text-right text-[12px] tabular-nums text-[var(--text-muted)]">
                  {formatTime(last.loggedAt, timezone)}
                </span>
                <span className="mono w-[26px] shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  {EYE_SHORT[last.eye as keyof typeof EYE_SHORT]}
                </span>
                <div
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  <CaretRightIcon size={12} color="var(--text-faint)" />
                </div>
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isExpanded ? "1fr" : "0fr",
                  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div className="overflow-hidden">
                  <div className="rounded-[10px] bg-[var(--surface-el)] px-3 pt-2.5 pb-3 mb-1">
                    <div className="mb-2 flex items-baseline justify-between">
                      <p className="mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                        {typeQuantity} {typeQuantity === 1 ? "gota" : "gotas"}
                      </p>
                      {typedDrops.length > 1 && (
                        <p className="mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                          Intervalos
                        </p>
                      )}
                    </div>
                    <DropsTimeline drops={typedDrops} timezone={timezone} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

function PrimaryRow({
  field,
  value,
  barsReady,
}: {
  field: ScoreField;
  value: number;
  barsReady: boolean;
}) {
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
        <span className="text-[10px] font-normal opacity-60">/10</span>
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
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {item.triggerType
                ? `Trigger: ${item.triggerType === "other" && item.notes ? item.notes : TRIGGER_LABELS[item.triggerType]}`
                : label}
            </p>
            <p className="mono text-[11px] text-[var(--text-muted)]">{formatTime(item.loggedAt, timezone)}</p>
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
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
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
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
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
    </article>
  );
}

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

export function SymptomCard({ item, timezone }: { item: DisplaySymptomGroup; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-el)]">
          <PulseIcon size={15} color="var(--text-muted)" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Síntomas</p>
          <p className="mono text-[10px] text-[var(--text-muted)]">{time}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 pl-[42px]">
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
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              Sueño · {item.sleepHours}h
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">{time}</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: qualityColor }}>
          {SLEEP_QUALITY_LABELS[item.sleepQuality]}
        </span>
      </div>
    </article>
  );
}

export function HygieneCard({ item }: { item: HygieneRecord }) {
  const statusColor = HYGIENE_STATUS_COLORS[item.status];
  const statusLabel = HYGIENE_STATUS_LABELS[item.status];

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)` }}
          >
            <EyeIcon size={15} style={{ color: statusColor }} />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              Higiene palpebral
            </p>
            {item.completedCount > 0 && (
              <div className="flex items-center gap-[3px] mt-1">
                {Array.from({ length: Math.min(item.completedCount, 6) }).map((_, i) => (
                  <span
                    key={i}
                    className="block h-[5px] w-[5px] rounded-full"
                    style={{ background: statusColor }}
                  />
                ))}
                {item.completedCount > 6 && (
                  <span className="mono text-[10px] font-semibold ml-0.5" style={{ color: statusColor }}>
                    {item.completedCount}×
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>
    </article>
  );
}
