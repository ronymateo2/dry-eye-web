import { useState, useEffect, useCallback } from "react";
import {
  PulseIcon,
  CheckIcon,
  CaretRightIcon,
  DropIcon,
  MoonIcon,
  SunIcon,
  LightningIcon,
  NotePencilIcon,
  BedIcon,
  EyeIcon,
} from "@phosphor-icons/react";
import eyelidsImg from "@/assets/pain-areas/eyelids.webp";
import templesImg from "@/assets/pain-areas/temples.webp";
import orbitalImg from "@/assets/pain-areas/orbital.webp";
import masseterImg from "@/assets/pain-areas/masseter.webp";
import cervicalImg from "@/assets/pain-areas/cervical.webp";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMPTOM_OPTIONS, OBS_EYE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { getDayKey, } from "@/lib/utils";
import type { TriggerType, ObservationEye, SleepQuality, HistoryEntry, HistoryDayGroup, HistoryFeed, HygieneRecord, HygieneStatus } from "@/types/domain";

// ─── Display types (post-collapse) ───────────────────────────────────────────

type DisplayCheckIn = {
  kind: "check_in";
  id: string;
  loggedAt: string;
  eyelidPain: number;
  templePain: number;
  masseterPain: number;
  cervicalPain: number;
  orbitalPain: number;
  triggerType: TriggerType | null;
  notes: string | null;
};
type DisplayDrop = {
  kind: "drop";
  id: string;
  loggedAt: string;
  name: string;
  quantity: number;
  eye: "left" | "right" | "both";
};
type DisplayTriggerGroup = {
  kind: "trigger_group";
  id: string;
  loggedAt: string;
  triggers: { triggerType: TriggerType; intensity: 1 | 2 | 3 }[];
};
type DisplaySymptomGroup = {
  kind: "symptom_group";
  id: string;
  loggedAt: string;
  symptomTypes: string[];
};
type DisplayObservation = {
  kind: "observation";
  id: string;
  loggedAt: string;
  title: string;
  notes: string | null;
  eye: ObservationEye;
  intensity: number;
  durationMinutes: number | null;
};
type DisplaySleep = {
  kind: "sleep";
  id: string;
  loggedAt: string;
  sleepHours: number;
  sleepQuality: SleepQuality;
};

type DisplayDropGroup = {
  kind: "drop_group";
  id: string;
  loggedAt: string;
  drops: DisplayDrop[];
};
type DisplayHygiene = {
  kind: "hygiene";
  id: string;
  loggedAt: string;
  record: HygieneRecord;
};

type DisplayItem =
  | DisplayCheckIn
  | DisplayDropGroup
  | DisplayTriggerGroup
  | DisplaySymptomGroup
  | DisplayObservation
  | DisplaySleep
  | DisplayHygiene;

type OccurrenceRow = {
  id: string;
  observationId: string;
  loggedAt: string;
  intensity: number;
  durationMinutes: number | null;
  notes: string | null;
  title: string;
  eye: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<TriggerType, string> = {
  climate: "Clima",
  humidifier: "Humidificador",
  stress: "Estrés",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonomía",
  exercise: "Ejercicio",
  other: "Otro",
};

const EYE_LABELS = {
  left: "Izquierdo",
  right: "Derecho",
  both: "Ambos",
} as const;

const EYE_SHORT = {
  left: "IZQ",
  right: "DER",
  both: "AMB",
} as const;

const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  muy_malo: "Muy malo",
  malo: "Malo",
  regular: "Regular",
  bueno: "Bueno",
  excelente: "Excelente",
};

const SLEEP_QUALITY_COLORS: Record<SleepQuality, string> = {
  muy_malo: "var(--pain-high)",
  malo: "var(--pain-mid)",
  regular: "var(--text-muted)",
  bueno: "var(--pain-low)",
  excelente: "var(--pain-low)",
};

const HYGIENE_STATUS_LABELS: Record<HygieneStatus, string> = {
  completed: "Completado",
  partial: "Parcial",
  skipped: "Omitido",
};

const HYGIENE_STATUS_COLORS: Record<HygieneStatus, string> = {
  completed: "var(--pain-low)",
  partial: "var(--pain-mid)",
  skipped: "var(--text-faint)",
};

const HISTORY_TABS = [
  { label: "Todo", value: "all" },
  { label: "Observaciones", value: "observations" },
] as const;

type HistoryTab = (typeof HISTORY_TABS)[number]["value"];

type ScoreField = { key: keyof DisplayCheckIn; img: string; label: string };

const PRIMARY_FIELDS: ScoreField[] = [
  { key: "eyelidPain", img: eyelidsImg, label: "Párpado" },
  { key: "templePain", img: templesImg, label: "Sien" },
  { key: "orbitalPain", img: orbitalImg, label: "Orbital" },
];

const PERIPHERAL_FIELDS: ScoreField[] = [
  { key: "masseterPain", img: masseterImg, label: "Masetero" },
  { key: "cervicalPain", img: cervicalImg, label: "Cervical" },
];

const ALL_SCORE_FIELDS: ScoreField[] = [...PRIMARY_FIELDS, ...PERIPHERAL_FIELDS];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const hourFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(timezone: string): Intl.DateTimeFormat {
  if (!timeFormatterCache.has(timezone)) {
    timeFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
      }),
    );
  }
  return timeFormatterCache.get(timezone)!;
}

function getHourFormatter(timezone: string): Intl.DateTimeFormat {
  if (!hourFormatterCache.has(timezone)) {
    hourFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("es-CO", {
        hour: "2-digit",
        hour12: false,
        timeZone: timezone,
      }),
    );
  }
  return hourFormatterCache.get(timezone)!;
}

function formatTime(loggedAt: string, timezone: string) {
  return getTimeFormatter(timezone).format(new Date(loggedAt));
}

function formatShortDate(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase()
    .replace(".", "");
}

function getDayPillLabel(dayKey: string, timezone: string): string | null {
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: timezone });
  if (dayKey === todayKey) return "HOY";
  if (dayKey === yesterdayKey) return "AYER";
  return null;
}

function getTimeOfDay(loggedAt: string, timezone: string): { label: string; isMoon: boolean } {
  const hour = parseInt(getHourFormatter(timezone).format(new Date(loggedAt)), 10);
  if (hour >= 6 && hour < 12) return { label: "Mañana", isMoon: false };
  if (hour >= 12 && hour < 19) return { label: "Tarde", isMoon: false };
  return { label: "Noche", isMoon: true };
}

function painColor(score: number): string {
  if (score >= 7) return "var(--pain-high)";
  if (score >= 4) return "var(--pain-mid)";
  return "var(--pain-low)";
}

function intensityColor(intensity: 1 | 2 | 3): string {
  if (intensity === 3) return "var(--pain-high)";
  if (intensity === 2) return "var(--pain-mid)";
  return "var(--accent)";
}

function getDotColor(item: DisplayItem): string {
  if (item.kind === "check_in") return "var(--accent)";
  if (item.kind === "trigger_group") {
    const max = Math.max(...item.triggers.map((t) => t.intensity)) as 1 | 2 | 3;
    return intensityColor(max);
  }
  if (item.kind === "drop_group") return "var(--pain-low)";
  if (item.kind === "hygiene") return HYGIENE_STATUS_COLORS[item.record.status];
  return "var(--text-muted)";
}

function collapseEntries(entries: HistoryEntry[]): DisplayItem[] {
  const result: DisplayItem[] = [];
  const drops: DisplayDrop[] = [];

  for (const entry of entries) {
    if (entry.kind === "check_in") {
      result.push(entry as unknown as DisplayCheckIn);
      continue;
    }

    if (entry.kind === "drop") {
      drops.push(entry as unknown as DisplayDrop);
      continue;
    }

    if (entry.kind === "trigger") {
      const last = result[result.length - 1];
      if (last?.kind === "trigger_group" && last.loggedAt === entry.loggedAt) {
        last.triggers.push({
          triggerType: entry.triggerType as TriggerType,
          intensity: entry.intensity as 1 | 2 | 3,
        });
      } else {
        result.push({
          kind: "trigger_group",
          id: entry.id,
          loggedAt: entry.loggedAt,
          triggers: [{ triggerType: entry.triggerType as TriggerType, intensity: entry.intensity as 1 | 2 | 3 }],
        });
      }
      continue;
    }

    if (entry.kind === "symptom") {
      const last = result[result.length - 1];
      if (last?.kind === "symptom_group" && last.loggedAt === entry.loggedAt) {
        last.symptomTypes.push(entry.symptomType as string);
      } else {
        result.push({
          kind: "symptom_group",
          id: entry.id,
          loggedAt: entry.loggedAt,
          symptomTypes: [entry.symptomType as string],
        });
      }
      continue;
    }

    if (entry.kind === "observation" || entry.kind === "sleep") {
      result.push(entry as unknown as DisplayObservation | DisplaySleep);
      continue;
    }
  }

  if (drops.length > 0) {
    const latest = drops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
    result.push({ kind: "drop_group", id: latest.id, loggedAt: latest.loggedAt, drops });
  }

  return result;
}

// ─── Drops block ──────────────────────────────────────────────────────────────

function DropDots({ count }: { count: number }) {
  const MAX = 6;
  const dots = Math.min(count, MAX);
  return (
    <div className="flex items-center gap-[3px]">
      {count > MAX && (
        <span className="mono text-[10px] font-semibold mr-0.5" style={{ color: "var(--pain-low)" }}>
          {count}×
        </span>
      )}
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className="block h-[5px] w-[5px] rounded-full"
          style={{ background: "var(--pain-low)" }}
        />
      ))}
    </div>
  );
}

function DropsBlock({ drops, timezone }: { drops: DisplayDrop[]; timezone: string }) {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const groups = new Map<string, DisplayDrop[]>();
  for (const d of drops) {
    if (!groups.has(d.name)) groups.set(d.name, []);
    groups.get(d.name)!.push(d);
  }

  const groupEntries = Array.from(groups.entries());
  const applicationLabel = drops.length === 1 ? "aplicación" : "aplicaciones";

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-3.5 py-3.5">
        <DropIcon size={11} color="var(--text-faint)" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
          Gotas
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="mono text-[13px] font-semibold leading-none text-[var(--text-primary)]">
            {drops.length}
          </span>
          <span className="text-[10px] text-[var(--text-faint)]">
            {applicationLabel}
          </span>
        </div>
      </div>

      {groupEntries.map(([name, typedDrops]) => {
        const last = typedDrops.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
        const isExpanded = expandedType === name;

        return (
          <div key={name}>
            <button
              className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left"
              onClick={() => setExpandedType(isExpanded ? null : name)}
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-regular text-[var(--text-primary)]">
                {name}
              </span>
              <DropDots count={typedDrops.length} />
              <span className="mono ml-1 shrink-0 text-[11px] text-[var(--text-muted)]">
                {formatTime(last.loggedAt, timezone)} {EYE_SHORT[last.eye]}
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
                <div className="pt-1 pb-1.5">
                  {typedDrops.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="mono text-[12px] text-[var(--text-muted)]">
                        {formatTime(d.loggedAt, timezone)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--text-secondary)]">
                          {d.quantity} {d.quantity === 1 ? "gota" : "gotas"} · {EYE_LABELS[d.eye]}
                        </span>
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
                          <CheckIcon size={9} color="var(--pain-low)" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Collapsed day summary ────────────────────────────────────────────────────

function CollapsedDaySummary({
  group,
  timezone,
  onExpand,
}: {
  group: HistoryDayGroup;
  timezone: string;
  onExpand: () => void;
}) {
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
      className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--surface-el)]"
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
        <span className="text-[12px] font-medium leading-none text-[var(--text-secondary)]">
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

function CheckInCard({ item, timezone }: { item: DisplayCheckIn; timezone: string }) {
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(212,162,76,0.12)]">
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

function TriggerCard({ item, timezone }: { item: DisplayTriggerGroup; timezone: string }) {
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

function SymptomCard({ item, timezone }: { item: DisplaySymptomGroup; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(90,78,58,0.25)]">
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

function ObservationCard({ item, timezone }: { item: DisplayObservation; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const eyeLabel = OBS_EYE_LABELS[item.eye];
  const intensityHue = painColor(item.intensity);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(90,78,58,0.25)]">
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
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">{item.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SleepCard({ item, timezone }: { item: DisplaySleep; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const qualityColor = SLEEP_QUALITY_COLORS[item.sleepQuality];

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(90,78,58,0.25)]">
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

function HygieneCard({ item }: { item: HygieneRecord }) {
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

function renderItem(item: DisplayItem, timezone: string) {
  if (item.kind === "check_in") return <CheckInCard item={item} timezone={timezone} />;
  if (item.kind === "drop_group") return <DropsBlock drops={item.drops} timezone={timezone} />;
  if (item.kind === "hygiene") return <HygieneCard item={item.record} />;
  if (item.kind === "trigger_group") return <TriggerCard item={item} timezone={timezone} />;
  if (item.kind === "observation") return <ObservationCard item={item} timezone={timezone} />;
  if (item.kind === "sleep") return <SleepCard item={item} timezone={timezone} />;
  return <SymptomCard item={item} timezone={timezone} />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-8">
      {[["checkin", "slim", "slim"], ["checkin", "slim"], ["slim", "checkin"]].map((group, i) => (
        <div key={i} className="space-y-2.5">
          <Skeleton className="h-7 w-24 rounded-full" />
          {group.map((type, j) => (
            <Skeleton key={j} className={type === "checkin" ? "h-28 w-full rounded-[14px]" : "h-14 w-full rounded-[14px]"} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Observations tab ─────────────────────────────────────────────────────────

const OBS_PAGE_SIZE = 5;

function ObservationsTab({ timezone }: { timezone: string }) {
  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    api.getObservationOccurrences({ limit: OBS_PAGE_SIZE }).then((data) => {
      setOccurrences(data.occurrences);
      setHasMore(data.hasMore);
    }).catch(() => {
      setOccurrences([]);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || occurrences.length === 0) return;
    const before = occurrences[occurrences.length - 1].loggedAt;
    setIsLoadingMore(true);
    try {
      const data = await api.getObservationOccurrences({ limit: OBS_PAGE_SIZE, before });
      setOccurrences((prev) => [...prev, ...data.occurrences]);
      setHasMore(data.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[14px] bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  if (occurrences.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
        No hay observaciones clínicas aún. Toca + para registrar tu primera observación.
      </div>
    );
  }

  const groups = new Map<string, { title: string; eye: string; items: OccurrenceRow[] }>();
  for (const occ of occurrences) {
    const existing = groups.get(occ.observationId);
    if (existing) {
      existing.items.push(occ);
    } else {
      groups.set(occ.observationId, { title: occ.title, eye: occ.eye, items: [occ] });
    }
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([obsId, group]) => (
        <div key={obsId} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">{group.title}</p>
              {group.eye && group.eye !== "none" ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)] mt-0.5">
                  {OBS_EYE_LABELS[group.eye]}
                </p>
              ) : null}
            </div>
            <span className="mono shrink-0 inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-[var(--surface-el)] text-[11px] font-semibold text-[var(--text-muted)]">
              {group.items.length}
            </span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {group.items.map((item) => {
              const time = formatTime(item.loggedAt, timezone);
              const dayKey = getDayKey(item.loggedAt, timezone);
              const pillLabel = getDayPillLabel(dayKey, timezone);
              const shortDate = formatShortDate(dayKey);
              const dateLabel = pillLabel ?? shortDate;
              const intensityHue = painColor(item.intensity);
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="mono text-[11px] text-[var(--text-muted)]">
                        {dateLabel} · {time}
                        {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}
                      </p>
                      <span className="mono shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: intensityHue }}>
                        {item.intensity}/10
                      </span>
                    </div>
                    {item.notes ? (
                      <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-secondary)]">{item.notes}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="mono text-[11px] tracking-[0.12em] text-[var(--text-muted)] disabled:opacity-50"
          >
            {isLoadingMore ? "CARGANDO..." : "CARGAR MÁS"}
          </button>
        </div>
      )}
      {!hasMore && occurrences.length > 0 && (
        <p className="mono text-center text-[10px] tracking-[0.12em] text-[var(--text-faint)] pb-4">
          INICIO DEL HISTORIAL
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const user = useUser();
  const [feed, setFeed] = useState<HistoryFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const timezone = feed?.timezone ?? user.timezone ?? "America/Bogota";

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory();
      setFeed(data);
      const todayKey = getDayKey(new Date().toISOString(), data.timezone);
      setExpandedDays(new Set([todayKey]));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    const handler = async () => {
      const data = await api.getHistory();
      setFeed(data);
    };
    window.addEventListener("history:refresh", handler);
    return () => window.removeEventListener("history:refresh", handler);
  }, []);

  const loadMore = async () => {
    if (!feed || isLoadingMore) return;
    const lastGroup = feed.groups[feed.groups.length - 1];
    if (!lastGroup) return;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const more = await api.getHistoryMore(lastGroup.dayKey);
      setFeed((prev) => {
        if (!prev) return more;
        const hygieneByDay = new Map<string, HygieneRecord>();
        for (const row of prev.hygiene) hygieneByDay.set(row.dayKey, row);
        for (const row of more.hygiene) hygieneByDay.set(row.dayKey, row);
        return {
          ...more,
          groups: [...prev.groups, ...more.groups],
          hygiene: Array.from(hygieneByDay.values()),
        };
      });
    } catch {
      setLoadError("No se pudo cargar más registros. Intenta de nuevo.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const hygieneByDay = new Map<string, HygieneRecord>();
  for (const row of feed?.hygiene ?? []) hygieneByDay.set(row.dayKey, row);

  return (
    <section>
      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <>
          {/* Minimal underline tabs */}
          <div className="mb-6 flex gap-6 border-b border-[var(--border)]">
            {HISTORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="relative pb-2.5 text-[14px] font-semibold transition-colors duration-150"
                style={{
                  color: activeTab === tab.value ? "var(--text-primary)" : "var(--text-faint)",
                }}
              >
                {tab.label}
                {activeTab === tab.value && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </button>
            ))}
          </div>

          {activeTab === "observations" ? (
            <ObservationsTab timezone={timezone} />
          ) : !feed || feed.groups.length === 0 ? (
            <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
              Aún no tienes registros. Ve a Registrar para empezar.
            </div>
          ) : (
            <>
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
                              <div className="min-w-0 flex-1">{renderItem(item, timezone)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 pb-4">
                {loadError && (
                  <div className="w-full rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(204,63,48,0.12)] border border-[rgba(204,63,48,0.3)] text-[var(--pain-high)]">
                    {loadError}
                  </div>
                )}
                {feed.hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="mono text-[11px] tracking-[0.12em] text-[var(--text-muted)] disabled:opacity-50"
                  >
                    {isLoadingMore ? "CARGANDO..." : "CARGAR MÁS"}
                  </button>
                )}
                {!feed.hasMore && (
                  <p className="mono text-[10px] tracking-[0.12em] text-[var(--text-faint)]">
                    INICIO DEL HISTORIAL
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
