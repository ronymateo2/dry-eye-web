import type { TriggerType, ObservationEye, SleepQuality, HygieneRecord } from "@/types/domain";

export type DisplayCheckIn = {
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

export type DisplayDrop = {
  kind: "drop";
  id: string;
  loggedAt: string;
  name: string;
  quantity: number;
  eye: "left" | "right" | "both";
};

export type DisplayTriggerGroup = {
  kind: "trigger_group";
  id: string;
  loggedAt: string;
  triggers: { triggerType: TriggerType; intensity: 1 | 2 | 3 }[];
};

export type DisplaySymptomGroup = {
  kind: "symptom_group";
  id: string;
  loggedAt: string;
  symptomTypes: string[];
};

export type DisplayObservation = {
  kind: "observation";
  id: string;
  loggedAt: string;
  title: string;
  notes: string | null;
  eye: ObservationEye;
  intensity: number;
  durationMinutes: number | null;
};

export type DisplaySleep = {
  kind: "sleep";
  id: string;
  loggedAt: string;
  sleepHours: number;
  sleepQuality: SleepQuality;
};

export type DisplayDropGroup = {
  kind: "drop_group";
  id: string;
  loggedAt: string;
  drops: DisplayDrop[];
};

export type DisplayHygiene = {
  kind: "hygiene";
  id: string;
  loggedAt: string;
  record: HygieneRecord;
};

export type DisplayItem =
  | DisplayCheckIn
  | DisplayDropGroup
  | DisplayTriggerGroup
  | DisplaySymptomGroup
  | DisplayObservation
  | DisplaySleep
  | DisplayHygiene;

export type OccurrenceRow = {
  id: string;
  observationId: string;
  loggedAt: string;
  intensity: number;
  durationMinutes: number | null;
  notes: string | null;
  title: string;
  eye: string;
};

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  climate: "Clima",
  humidifier: "Humidificador",
  stress: "Estrés",
  screens: "Pantallas",
  tv: "TV",
  ergonomics: "Ergonomía",
  exercise: "Ejercicio",
  other: "Otro",
};

export const EYE_LABELS = {
  left: "Izquierdo",
  right: "Derecho",
  both: "Ambos",
} as const;

export const EYE_SHORT = {
  left: "IZQ",
  right: "DER",
  both: "AMB",
} as const;

export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  muy_malo: "Muy malo",
  malo: "Malo",
  regular: "Regular",
  bueno: "Bueno",
  excelente: "Excelente",
};

export const SLEEP_QUALITY_COLORS: Record<SleepQuality, string> = {
  muy_malo: "var(--pain-high)",
  malo: "var(--pain-mid)",
  regular: "var(--text-muted)",
  bueno: "var(--pain-low)",
  excelente: "var(--pain-low)",
};

export const HYGIENE_STATUS_LABELS: Record<HygieneStatus, string> = {
  completed: "Completado",
  partial: "Parcial",
  skipped: "Omitido",
};

import type { HygieneStatus } from "@/types/domain";

export const HYGIENE_STATUS_COLORS: Record<HygieneStatus, string> = {
  completed: "var(--pain-low)",
  partial: "var(--pain-mid)",
  skipped: "var(--text-faint)",
};

export const HISTORY_TABS = [
  { label: "Todo", value: "all" },
  { label: "Observaciones", value: "observations" },
] as const;

export type HistoryTab = (typeof HISTORY_TABS)[number]["value"];

import eyelidsImg from "@/assets/pain-areas/eyelids.webp";
import templesImg from "@/assets/pain-areas/temples.webp";
import orbitalImg from "@/assets/pain-areas/orbital.webp";
import masseterImg from "@/assets/pain-areas/masseter.webp";
import cervicalImg from "@/assets/pain-areas/cervical.webp";

export type ScoreField = { key: keyof DisplayCheckIn; img: string; label: string };

export const PRIMARY_FIELDS: ScoreField[] = [
  { key: "eyelidPain", img: eyelidsImg, label: "Párpado" },
  { key: "templePain", img: templesImg, label: "Sien" },
  { key: "orbitalPain", img: orbitalImg, label: "Orbital" },
];

export const PERIPHERAL_FIELDS: ScoreField[] = [
  { key: "masseterPain", img: masseterImg, label: "Masetero" },
  { key: "cervicalPain", img: cervicalImg, label: "Cervical" },
];

export const ALL_SCORE_FIELDS: ScoreField[] = [...PRIMARY_FIELDS, ...PERIPHERAL_FIELDS];
