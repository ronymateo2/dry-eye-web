import type { HistoryEntry, TriggerType } from "@/types/domain";
import type { DisplayItem, DisplayCheckIn, DisplayDrop, DisplayObservation, DisplaySleep } from "./types";
import { HYGIENE_STATUS_COLORS } from "./types";

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

export function formatTime(loggedAt: string, timezone: string) {
  return getTimeFormatter(timezone).format(new Date(loggedAt));
}

export function formatShortDate(dayKey: string): string {
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

export function getDayPillLabel(dayKey: string, timezone: string): string | null {
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: timezone });
  if (dayKey === todayKey) return "HOY";
  if (dayKey === yesterdayKey) return "AYER";
  return null;
}

export function getTimeOfDay(loggedAt: string, timezone: string): { label: string; isMoon: boolean } {
  const hour = parseInt(getHourFormatter(timezone).format(new Date(loggedAt)), 10);
  if (hour >= 6 && hour < 12) return { label: "Mañana", isMoon: false };
  if (hour >= 12 && hour < 19) return { label: "Tarde", isMoon: false };
  return { label: "Noche", isMoon: true };
}

export function painColor(score: number): string {
  if (score >= 7) return "var(--pain-high)";
  if (score >= 4) return "var(--pain-mid)";
  return "var(--pain-low)";
}

export function intensityColor(intensity: 1 | 2 | 3): string {
  if (intensity === 3) return "var(--pain-high)";
  if (intensity === 2) return "var(--pain-mid)";
  return "var(--accent)";
}

export function getDotColor(item: DisplayItem): string {
  if (item.kind === "check_in") return "var(--accent)";
  if (item.kind === "trigger_group") {
    const max = Math.max(...item.triggers.map((t) => t.intensity)) as 1 | 2 | 3;
    return intensityColor(max);
  }
  if (item.kind === "drop_group") return "var(--accent)";
  if (item.kind === "hygiene") return HYGIENE_STATUS_COLORS[item.record.status];
  return "var(--text-muted)";
}

export function collapseEntries(entries: HistoryEntry[]): DisplayItem[] {
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
