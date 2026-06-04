import type { MedicationRecord } from "@/types/domain";

export type TodayIntake = {
  id: string;
  medication_id: string;
  logged_at: string;
  dosage_taken: string | null;
  notes: string | null;
};

export type UpcomingSlot = {
  key: string;
  medicationIds: string[];
  names: string[];
  slotTime: Date;
  slotTimeLabel: string;
  overdue: boolean;
  countdownLabel: string;
  countdownColor: string;
  countdownProgress: number;
  totalIntervalMs: number;
  medications: MedicationRecord[];
};

export type RegisteredSlot = {
  key: string;
  medicationId: string;
  name: string;
  intakeId: string;
  loggedAt: string;
  timeLabel: string;
  dosageTaken: string | null;
  notes: string | null;
  medication: MedicationRecord;
};

export function parseTimesJson(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && /^\d{2}:\d{2}$/.test(t));
  } catch {
    return [];
  }
}

let _cachedDayKey = "";
let _cachedTodayStartMs = 0;

function getCachedTodayStart(now: number, tz: string): number {
  const dayKey = new Date(now).toLocaleDateString("en-CA", { timeZone: tz });
  if (dayKey !== _cachedDayKey) {
    _cachedDayKey = dayKey;
    _cachedTodayStartMs = getTodayStartUtcMs(now, tz);
  }
  return _cachedTodayStartMs;
}

function getTodayStartUtcMs(now: number, tz: string): number {
  const todayKey = new Date(now).toLocaleDateString("en-CA", { timeZone: tz });
  const [y, mo, d] = todayKey.split("-").map(Number) as [number, number, number];
  const utcNoon = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(utcNoon);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value);
  const localNoonMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = utcNoon.getTime() - localNoonMs;
  return Date.UTC(y, mo - 1, d) + offsetMs;
}

function makeTodaySlotDate(timeStr: string, todayStartMs: number): Date {
  const [h, m] = timeStr.split(":").map(Number) as [number, number];
  return new Date(todayStartMs + h * 3_600_000 + m * 60_000);
}

function formatTime24(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
}

function getSlotCountdown(
  slotMs: number,
  now: number,
  totalMs: number,
): { label: string; overdue: boolean; color: string; progress: number } {
  const diffMs = slotMs - now;
  if (diffMs <= 0) {
    const abs = -diffMs;
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    return {
      label: h > 0 ? `hace ${h}h ${m}m` : `hace ${m}m`,
      overdue: true,
      color: "var(--dose-overdue)",
      progress: 1,
    };
  }
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const progress = Math.max(0, Math.min(1, 1 - diffMs / totalMs));
  const color =
    progress < 0.5 ? "var(--dose-early)" : progress < 0.8 ? "var(--dose-mid)" : "var(--dose-late)";
  return { label, overdue: false, color, progress };
}

export function buildSchedule(
  medications: MedicationRecord[],
  todayIntakes: TodayIntake[],
  now: number,
  tz: string,
): { upcoming: UpcomingSlot[]; registered: RegisteredSlot[] } {
  const todayStartMs = getCachedTodayStart(now, tz);
  const registered: RegisteredSlot[] = [];

  const intakesByMed = new Map<string, TodayIntake[]>();
  for (const intake of todayIntakes) {
    const arr = intakesByMed.get(intake.medication_id) ?? [];
    arr.push(intake);
    intakesByMed.set(intake.medication_id, arr);
  }
  for (const arr of intakesByMed.values()) {
    arr.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  }

  type RawSlot = {
    key: string;
    medicationId: string;
    name: string;
    slotTime: Date;
    slotTimeLabel: string;
    overdue: boolean;
    countdownLabel: string;
    countdownColor: string;
    countdownProgress: number;
    totalIntervalMs: number;
    medication: MedicationRecord;
  };
  const rawUpcoming: RawSlot[] = [];

  for (const med of medications) {
    const times = parseTimesJson(med.times_json);
    if (times.length === 0) continue;

    const slots = times
      .map((t) => makeTodaySlotDate(t, todayStartMs))
      .sort((a, b) => a.getTime() - b.getTime());

    const minInterval =
      slots.length > 1
        ? Math.min(...slots.slice(1).map((s, i) => s.getTime() - slots[i]!.getTime()))
        : 86_400_000;

    const medIntakes = intakesByMed.get(med.id) ?? [];

    for (const intake of medIntakes) {
      registered.push({
        key: intake.id,
        medicationId: med.id,
        name: med.name,
        intakeId: intake.id,
        loggedAt: intake.logged_at,
        timeLabel: formatTime24(intake.logged_at, tz),
        dosageTaken: intake.dosage_taken,
        notes: intake.notes,
        medication: med,
      });
    }

    const nTaken = Math.min(medIntakes.length, slots.length);
    for (let i = nTaken; i < slots.length; i++) {
      const slotTime = slots[i]!;
      const { label, overdue, color, progress } = getSlotCountdown(slotTime.getTime(), now, minInterval);
      rawUpcoming.push({
        key: `${med.id}-${i}`,
        medicationId: med.id,
        name: med.name,
        slotTime,
        slotTimeLabel: slotTime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
        overdue,
        countdownLabel: label,
        countdownColor: color,
        countdownProgress: progress,
        totalIntervalMs: minInterval,
        medication: med,
      });
    }
  }

  rawUpcoming.sort((a, b) => a.slotTime.getTime() - b.slotTime.getTime());

  const groupedMap = new Map<number, RawSlot[]>();
  for (const slot of rawUpcoming) {
    const key = slot.slotTime.getTime();
    const arr = groupedMap.get(key) ?? [];
    arr.push(slot);
    groupedMap.set(key, arr);
  }

  const upcoming: UpcomingSlot[] = [];
  for (const [, slots] of groupedMap) {
    const first = slots[0]!;
    upcoming.push({
      key: slots.map((s) => s.key).join("|"),
      medicationIds: slots.map((s) => s.medicationId),
      names: slots.map((s) => s.name),
      slotTime: first.slotTime,
      slotTimeLabel: first.slotTimeLabel,
      overdue: first.overdue,
      countdownLabel: first.countdownLabel,
      countdownColor: first.countdownColor,
      countdownProgress: first.countdownProgress,
      totalIntervalMs: first.totalIntervalMs,
      medications: slots.map((s) => s.medication),
    });
  }

  registered.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));

  return { upcoming, registered };
}

export function groupRegisteredByBatch(registered: RegisteredSlot[]): RegisteredSlot[][] {
  if (registered.length === 0) return [];
  const batches: RegisteredSlot[][] = [];
  let current: RegisteredSlot[] = [registered[0]!];
  for (let i = 1; i < registered.length; i++) {
    const prev = new Date(current[current.length - 1]!.loggedAt).getTime();
    const curr = new Date(registered[i]!.loggedAt).getTime();
    if (Math.abs(curr - prev) <= 2000) {
      current.push(registered[i]!);
    } else {
      batches.push(current);
      current = [registered[i]!];
    }
  }
  batches.push(current);
  return batches;
}
