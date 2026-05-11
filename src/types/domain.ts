export type TimeOfDay = "morning" | "evening" | "other" | "trigger";
export type SleepQuality = "muy_malo" | "malo" | "regular" | "bueno" | "excelente";
export type DropEye = "left" | "right" | "both";
export type TriggerType =
  | "climate" | "humidifier" | "stress" | "screens"
  | "tv" | "ergonomics" | "exercise" | "other";
export type ObservationEye = "right" | "left" | "both" | "none";
export type ObservationBodyZone = "eyelid" | "orbital" | "temple" | "masseter" | "cervical" | "other";
export type ObservationCategory = "sensory" | "pain" | "functional" | "environmental" | "postural";
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
  is_vial?: boolean;
  vial_duration?: number | null;
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

export type PropertyType = "scale" | "boolean" | "select" | "text";

export type PropertyDef =
  | { key: string; label: string; type: "scale"; min?: number; max?: number }
  | { key: string; label: string; type: "boolean" }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "text"; maxLength?: number };

export type PropertyValue = number | boolean | string;
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
  intensity: number | null;
  durationMinutes: number | null;
  triggerType?: string | null;
  painQuality?: string | null;
  notes: string;
  propertyValues?: Record<string, PropertyValue>;
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
  started_at: string;
  ended_at: string | null;
  status: "active" | "discarded";
  vial_duration: number | null;
};

export type SaveVialInput = {
  id: string;
  dropTypeId: string;
  startedAt: string;
  dropId?: string;
};
