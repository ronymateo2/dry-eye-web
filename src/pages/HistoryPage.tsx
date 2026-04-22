import { useState, useEffect, useCallback, useRef, useLayoutEffect, type ReactNode } from "react";
import {
  PulseIcon,
  CheckIcon,
  CaretRightIcon,
  DropIcon,
  MoonIcon,
  SunIcon,
  LightningIcon,
  EyeIcon,
  HeadCircuitIcon,
  HandEyeIcon,
  SmileyMeltingIcon,
  BoneIcon,
  NotePencilIcon,
  BedIcon,
} from "@phosphor-icons/react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { SYMPTOM_OPTIONS, OBS_EYE_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import { getDayKey } from "@/lib/utils";
import type { TriggerType, ObservationEye, SleepQuality, HistoryEntry, HistoryFeed } from "@/types/domain";

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

type DisplayItem =
  | DisplayCheckIn
  | DisplayDrop
  | DisplayTriggerGroup
  | DisplaySymptomGroup
  | DisplayObservation
  | DisplaySleep;

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
  stress: "Estres",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonomia",
  exercise: "Ejercicio",
  other: "Otro",
};

const EYE_LABELS = {
  left: "Izquierdo",
  right: "Derecho",
  both: "Ambos",
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

const HISTORY_TABS = [
  { label: "Todo", value: "all" },
  { label: "Observaciones", value: "observations" },
] as const;

type HistoryTab = (typeof HISTORY_TABS)[number]["value"];

const SCORE_FIELDS: { key: keyof DisplayCheckIn; icon: ReactNode }[] = [
  { key: "eyelidPain", icon: <EyeIcon size={15} /> },
  { key: "templePain", icon: <HeadCircuitIcon size={15} /> },
  { key: "orbitalPain", icon: <HandEyeIcon size={15} /> },
  { key: "masseterPain", icon: <SmileyMeltingIcon size={15} /> },
  { key: "cervicalPain", icon: <BoneIcon size={15} /> },
];

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
  if (item.kind === "drop") return "var(--pain-low)";
  return "var(--text-muted)";
}

function collapseEntries(entries: HistoryEntry[]): DisplayItem[] {
  const result: DisplayItem[] = [];

  for (const entry of entries) {
    if (entry.kind === "check_in" || entry.kind === "drop") {
      result.push(entry as unknown as DisplayCheckIn | DisplayDrop);
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

  return result;
}

// ─── Card components ──────────────────────────────────────────────────────────

function CheckInCard({ item, timezone }: { item: DisplayCheckIn; timezone: string }) {
  const { label, isMoon } = getTimeOfDay(item.loggedAt, timezone);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setBarsReady(true), 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 pt-4 pb-3">
      <div className="flex items-start justify-between gap-2">
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
        <div className="flex shrink-0 gap-3">
          {SCORE_FIELDS.map(({ key, icon }) => {
            const score = item[key] as number;
            return (
              <div key={key} className="flex flex-col items-center gap-0.5">
                <span className="mono text-[15px] font-medium leading-none" style={{ color: painColor(score) }}>
                  {score}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{icon}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          { label: "Párpado", icon: <EyeIcon size={13} />, value: item.eyelidPain },
          { label: "Sien", icon: <HeadCircuitIcon size={13} />, value: item.templePain },
        ].map(({ label, icon, value }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="flex w-[13px] shrink-0 items-center justify-center" style={{ color: "var(--text-primary)" }}>
              {icon}
            </span>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--surface-el)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: barsReady ? `${value * 10}%` : "0%",
                  background: painColor(value),
                  transition: `width 650ms cubic-bezier(0.25, 1, 0.5, 1) 150ms`,
                }}
              />
            </div>
            <span className="mono w-[28px] text-right text-[11px] text-[var(--text-muted)]">{value}/10</span>
          </div>
        ))}
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

function DropCard({ item, timezone }: { item: DisplayDrop; timezone: string }) {
  const time = formatTime(item.loggedAt, timezone);
  const eyeLabel = EYE_LABELS[item.eye].toUpperCase();
  const quantityLabel = `${item.quantity} ${item.quantity === 1 ? "gota" : "gotas"}`;

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(90,78,58,0.25)]">
            <DropIcon size={15} color="var(--text-muted)" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {item.name} {quantityLabel}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
              ({eyeLabel}) · {time}
            </p>
          </div>
        </div>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(92,184,90,0.15)]">
          <CheckIcon size={12} color="var(--pain-low)" strokeWidth={2.5} />
        </div>
      </div>
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
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Sintomas</p>
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

function renderItem(item: DisplayItem, timezone: string) {
  if (item.kind === "check_in") return <CheckInCard item={item} timezone={timezone} />;
  if (item.kind === "drop") return <DropCard item={item} timezone={timezone} />;
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
        No hay observaciones clinicas aun. Toca + para registrar tu primera observacion.
      </div>
    );
  }

  // Group by observationId preserving order of first appearance
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
              <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{group.title}</p>
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
  const { signOut } = useAuth();
  const [feed, setFeed] = useState<HistoryFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");

  const timezone = feed?.timezone ?? user.timezone ?? "America/Bogota";

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory();
      setFeed(data);
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
      setFeed((prev) => prev ? { ...more, groups: [...prev.groups, ...more.groups] } : more);
    } catch {
      setLoadError("No se pudo cargar más registros. Intenta de nuevo.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section>
      <ScreenHeader
        title="Historial"
        description="El historial agrupa check-ins, gotas y triggers por dia para revisar contexto clinico rapido."
        user={user}
        action={<Button className="px-4 text-[13px]" onClick={signOut} type="button" variant="ghost">Cerrar sesion</Button>}
      />

      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <>
          <div className="mb-6">
            <SegmentedControl
              label=""
              options={HISTORY_TABS}
              value={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {activeTab === "observations" ? (
            <ObservationsTab timezone={timezone} />
          ) : !feed || feed.groups.length === 0 ? (
            <div className="rounded-[var(--radius-md)] px-4 py-3 text-[13px] bg-[rgba(92,184,90,0.12)] border border-[rgba(92,184,90,0.3)] text-[var(--pain-low)]">
              Aun no tienes registros. Ve a Registrar para empezar y cuando guardes veremos aqui check-ins, gotas y triggers agrupados por dia.
            </div>
          ) : (
            <>
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute bottom-0 left-[15px] top-2 w-px bg-[var(--border)]" />

                <div className="space-y-6">
                  {feed.groups.map((group) => {
                    const items = collapseEntries(group.entries);
                    const pillLabel = getDayPillLabel(group.dayKey, timezone);
                    const shortDate = formatShortDate(group.dayKey);

                    return (
                      <div key={group.dayKey}>
                        <div className="relative mb-3 flex items-center gap-2 py-1">
                          <span className="relative z-10 inline-flex h-7 items-center rounded-full border border-[var(--border)] bg-[var(--surface-el)] px-3 text-[10px] font-semibold tracking-[0.12em] text-[var(--text-primary)]">
                            {pillLabel ?? shortDate}
                          </span>
                          {pillLabel ? (
                            <span className="text-[11px] font-medium tracking-[0.1em] text-[var(--text-muted)]">
                              {shortDate}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2.5">
                          {items.map((item) => (
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
                    );
                  })}
                </div>
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
