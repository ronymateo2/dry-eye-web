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

export type DropTypeRecord = {
  id: string;
  name: string;
  sort_order?: number | null;
  interval_hours?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  suspension_note?: string | null;
  archived_at?: string | null;
};

export type DropScheduleEntry = {
  drop_type_id: string;
  name: string;
  interval_hours: number | null;
  last_logged_at: string | null;
  end_date?: string | null;
};

export type DropTypeStats = {
  drop_type_id: string;
  name: string;
  sort_order: number | null;
  interval_hours: number | null;
  first_logged_at: string | null;
  last_logged_at: string | null;
  total_uses: number;
  total_quantity: number;
  uses_left: number;
  uses_right: number;
  uses_both: number;
};

export type SaveDropInput = {
  id: string;
  dropTypeId: string;
  loggedAt: string;
  quantity: number;
  eye: DropEye;
};

export type MedicationPhase = {
  label: string;
  dosage: string;
  start_date: string;
  end_date: string | null;
};

export type MedicationRecord = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  sort_order: number | null;
  start_date: string | null;
  end_date: string | null;
  phases_json: string | null;
  times_json: string | null;
  archived_at?: string | null;
};

export type MedicationIntakeRecord = {
  id: string;
  medication_id: string;
  medication_name: string;
  logged_at: string;
  dosage_taken: string | null;
  notes: string | null;
};

export type SaveMedicationIntakeInput = {
  id: string;
  medicationId: string;
  loggedAt: string;
  dosageTaken?: string | null;
  notes?: string | null;
};

export type SaveMedicationInput = {
  id?: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  phasesJson?: string | null;
  timesJson?: string[] | null;
};

export type PainQuality = "ardor" | "hormigueo" | "electrico" | "presion" | "alodinia";
export type TherapyType = "miofascial" | "other";

export type SaveTherapySessionInput = {
  id: string;
  loggedAt: string;
  therapyType: TherapyType;
  notes?: string | null;
};

export type TherapySessionRecord = {
  id: string;
  logged_at: string;
  therapy_type: TherapyType;
  notes: string | null;
};

export type TherapyCorrelation = {
  therapyDays: number;
  avgPainAfterTherapy: number;
  avgPainBaseline: number;
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
  sessions?: { id: string; loggedAt: string }[];
};

export type HistoryEntry = { id: string; kind: string; loggedAt: string; [key: string]: unknown };
export type HistoryDayGroup = { dayKey: string; entries: HistoryEntry[] };
export type HistoryFeed = { ok: boolean; groups: HistoryDayGroup[]; hygiene: HygieneRecord[]; hasMore: boolean; timezone: string };

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type CalendarEventEntry = {
  scheduled_at: string;
  drop_type_id: string;
  name: string;
};

export type CalendarStatus = {
  authorized: boolean;
  events_today: Array<{
    drop_type_id: string;
    drop_type_name: string;
    day_key: string;
    count: number;
  }>;
};

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string;
  theme: "dark" | "light";
};

export type VialRecord = {
  id: string;
  drop_type_id: string;
  drop_type_name: string;
  duration_hours: number;
  name: string | null;
  created_at: string;
};

export type VialInstanceRecord = {
  id: string;
  vial_id: string;
  started_at: string;
  ended_at: string | null;
  status: "active" | "discarded";
  vial_name: string | null;
  drop_type_name: string;
  duration_hours: number;
};

export type SaveVialInput = {
  id: string;
  dropTypeId: string;
  durationHours?: number;
  name?: string | null;
};

export type SaveVialInstanceInput = {
  id: string;
  vialId: string;
  startedAt: string;
};
