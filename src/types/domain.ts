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
  quick_action?: boolean;
};

export type DropScheduleEntry = {
  drop_type_id: string;
  name: string;
  interval_hours: number | null;
  last_logged_at: string | null;
  end_date?: string | null;
  is_vial?: boolean;
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

export type PropertyType = "scale" | "boolean" | "select" | "text" | "number";

export type PropertyDef =
  | { id: string; key: string; label: string; type: "scale"; min?: number; max?: number }
  | { id: string; key: string; label: string; type: "boolean" }
  | { id: string; key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { id: string; key: string; label: string; type: "number" }
  | { id: string; key: string; label: string; type: "text" };

export type PropertyValue = number | boolean | string;

export type ObservationLinks = {
  drop_type_ids?: string[];
  check_in_id?: string;
  sleep_day_key?: string;
  medication_ids?: string[];
};

export type LastOccurrenceSnippet = {
  intensity: number | null;
  notes: string | null;
  field_values: Record<string, PropertyValue> | null;
  logged_at: string;
};

export type ObservationRecord = {
  id: string;
  title: string;
  eye: string;
  body_zone: string | null;
  body_zone_custom: string | null;
  category: string | null;
  properties_schema: PropertyDef[] | null;
  use_intensity: boolean;
  use_duration: boolean;
  last_logged_at: string | null;
  last_occurrences: LastOccurrenceSnippet[];
  occurrence_count: number;
};

export type OccurrenceRecord = {
  id: string;
  observationId: string;
  loggedAt: string;
  intensity: number | null;
  notes: string | null;
  propertyValues: Record<string, PropertyValue> | null;
  links: ObservationLinks | null;
  updatedAt: string | null;
  title: string;
  eye: string;
  bodyZone: string | null;
  bodyZoneCustom: string | null;
  propertiesSchema: PropertyDef[] | null;
};

export type PrevOccurrence = {
  id: string;
  loggedAt: string;
  intensity: number | null;
  durationMinutes: number | null;
  notes: string | null;
  propertyValues: Record<string, PropertyValue> | null;
  links: ObservationLinks | null;
};

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
  intensity?: number | null;
  durationMinutes?: number | null;
  notes?: string;
  propertyValues?: Record<string, PropertyValue>;
  links?: ObservationLinks;
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

export type TodayWidgetConfigEntry = { id: string; visible: boolean };

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string;
  theme: "dark" | "light";
  font: "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded" | null;
  notifications_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  widget_drop_type_ids: string[];
  today_widget_config: TodayWidgetConfigEntry[];
};

export type SymptomState = "calmado" | "leve" | "sensible" | "reactivo" | "brote";

export type SymptomIntensities = {
  dryness: number;
  burning: number;
  photophobia: number;
  blurry_vision: number;
  stinging?: number;
  pressure?: number;
};

export type SaveSymptomEntryInput = {
  id: string;
  logged_at: string;
  day_key: string;
  intensities: SymptomIntensities;
  triggers?: TriggerType[];
  note?: string;
};

export type SymptomEntryRecord = {
  id: string;
  logged_at: string;
  day_key: string;
  intensities: SymptomIntensities;
  triggers: TriggerType[];
  note: string | null;
  calculated_state: SymptomState;
  created_at: string;
};

export type SymptomTrendDay = {
  day_key: string;
  avg_intensity: number;
  state: SymptomState;
};

export type SymptomTopItem = {
  key: keyof SymptomIntensities;
  value: number;
};

export type SymptomStatusToday = {
  latest: SymptomEntryRecord | null;
  trend_7d: SymptomTrendDay[];
  top_symptoms: SymptomTopItem[];
};
