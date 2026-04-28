export type TimeOfDay = "morning" | "evening" | "other" | "trigger";
export type SleepQuality = "muy_malo" | "malo" | "regular" | "bueno" | "excelente";
export type DropEye = "left" | "right" | "both";
export type TriggerType =
  | "climate" | "humidifier" | "stress" | "screens"
  | "tv" | "ergonomics" | "exercise" | "other";
export type ObservationEye = "right" | "left" | "both" | "none";
export type HygieneStatus = "completed" | "skipped" | "partial";
export type FrictionType = "mental" | "logistics" | "none";

export type SleepRecord = {
  id: string;
  dayKey: string;
  loggedAt: string;
  sleepHours: number;
  sleepQuality: SleepQuality;
};

export type DropTypeRecord = { id: string; name: string; sort_order?: number | null };

export type SaveDropInput = {
  id: string;
  dropTypeId: string;
  loggedAt: string;
  quantity: number;
  eye: DropEye;
};

export type MedicationRecord = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  sort_order: number | null;
};

export type SaveMedicationInput = {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
};

export type SaveOccurrenceInput = {
  id: string;
  observationId: string;
  loggedAt: string;
  intensity: number;
  durationMinutes: number | null;
  notes: string;
};

export type SaveHygieneInput = {
  id: string;
  loggedAt: string;
  status: HygieneStatus;
  deviationValue: number | null;
  frictionType: FrictionType | null;
  userNote?: string;
};

export type HygieneRecord = {
  dayKey: string;
  loggedAt: string;
  status: HygieneStatus;
  deviationValue: number | null;
  frictionType: FrictionType | null;
  userNote: string | null;
  completedCount: number;
};

export type HistoryEntry = { id: string; kind: string; loggedAt: string; [key: string]: unknown };
export type HistoryDayGroup = { dayKey: string; entries: HistoryEntry[] };
export type HistoryFeed = { ok: boolean; groups: HistoryDayGroup[]; hygiene: HygieneRecord[]; hasMore: boolean; timezone: string };

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string;
  theme: "dark" | "light";
};
