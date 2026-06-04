import type { DropScheduleEntry } from "@/types/domain";
import type { DoseSlot } from "@/components/register/day-projection-sheet";
import type { ActiveVial } from "@/features/drops";

export type ActiveVialEntry = ActiveVial;

export function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays > 0) return `hace ${diffDays}d`;
  if (diffHr > 0) return `hace ${diffHr}h`;
  if (diffMin > 0) return `hace ${diffMin}m`;
  return "ahora";
}

export function getCountdown(
  lastLoggedAt: string,
  intervalHours: number,
  now: number,
): { label: string; overdue: boolean; nextTime: string; color: string; progress: number } {
  const intervalMs = intervalHours * 3_600_000;
  const nextMs = new Date(lastLoggedAt).getTime() + intervalMs;
  const diffMs = nextMs - now;
  const progress = Math.min(1, Math.max(0, 1 - diffMs / intervalMs));
  const nd = new Date(nextMs);
  const nh = nd.getHours(), nm = nd.getMinutes();
  const nextTime = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;

  let label: string;
  let color: string;
  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    label = h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`;
    color = "var(--dose-overdue)";
  } else {
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor((diffMs % 3_600_000) / 60_000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    color =
      progress < 0.5 ? "var(--dose-early)" : progress < 0.8 ? "var(--dose-mid)" : "var(--dose-late)";
  }

  return { label, overdue: diffMs <= 0, nextTime, color, progress };
}

export function isLoggedToday(entry: DropScheduleEntry, now: number): boolean {
  if (!entry.last_logged_at) return false;
  return new Date(entry.last_logged_at).toDateString() === new Date(now).toDateString();
}

export function isCompletedToday(entry: DropScheduleEntry, now: number): boolean {
  if (!entry.last_logged_at || !entry.interval_hours) return false;
  if (!isLoggedToday(entry, now)) return false;
  const nextMs = new Date(entry.last_logged_at).getTime() + entry.interval_hours * 3_600_000;
  if (nextMs <= now) return false;
  return new Date(nextMs).toDateString() !== new Date(now).toDateString();
}

export function getNextMs(entry: DropScheduleEntry): number {
  if (!entry.last_logged_at || !entry.interval_hours) return Number.POSITIVE_INFINITY;
  return new Date(entry.last_logged_at).getTime() + entry.interval_hours * 3_600_000;
}

export function buildDayProjection(entries: DropScheduleEntry[]): DoseSlot[] {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 86_400_000;
  const slots: DoseSlot[] = [];
  for (const entry of entries) {
    if (!entry.interval_hours || !entry.last_logged_at) continue;
    const intervalMs = entry.interval_hours * 3_600_000;
    let cursor = new Date(entry.last_logged_at).getTime() + intervalMs;
    while (cursor - intervalMs >= todayStart.getTime()) cursor -= intervalMs;
    while (cursor < todayEnd) {
      if (cursor >= todayStart.getTime()) {
        slots.push({ time: cursor, name: entry.name, drop_type_id: entry.drop_type_id });
      }
      cursor += intervalMs;
    }
  }
  return slots.sort((a, b) => a.time - b.time);
}

export function getVialStatus(vial: ActiveVialEntry, now: number) {
  const durationMs = (vial.vial_duration ?? 24) * 3_600_000;
  const diffMs = new Date(vial.started_at).getTime() + durationMs - now;
  const isExpired = diffMs <= 0;
  const isWarning = !isExpired && diffMs < 2 * 3_600_000;
  const color = isExpired
    ? "var(--pain-high)"
    : isWarning
      ? "var(--warning)"
      : "var(--pain-low)";
  const h = Math.floor(Math.abs(diffMs) / 3_600_000);
  const m = Math.floor((Math.abs(diffMs) % 3_600_000) / 60_000);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return {
    color,
    timeStr,
    isExpired,
    isWarning,
    label: isExpired ? `vencido hace ${timeStr}` : timeStr,
    rightLabel: isExpired ? `vencido hace ${timeStr}` : `vence en ${timeStr}`,
    fullLabel: isExpired ? `vial vencido hace ${timeStr}` : `vial activo · ${timeStr}`,
  };
}

export function dispatchQuickAction(sheet: string, extra?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("quickactions:open", { detail: { sheet, ...extra } }),
  );
}
