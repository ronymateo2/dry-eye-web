import type { MedicationRecord } from "@/types/domain";

export type { MedicationRecord, SaveMedicationInput, SaveMedicationIntakeInput } from "@/types/domain";
export type { TodayIntake } from "./domain";

export type ArchivedMedication = MedicationRecord & { archived_at: string };
export type LastIntakePerMed = { medication_id: string; last_logged_at: string | null };
