import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { MedicationRecord, SaveMedicationInput, SaveMedicationIntakeInput } from "@/types/domain";
import type { TodayIntake } from "./domain";

export type { TodayIntake } from "./domain";
export {
  parseTimesJson,
  buildSchedule,
  groupRegisteredByBatch,
  type UpcomingSlot,
  type RegisteredSlot,
} from "./domain";

export type ArchivedMedication = MedicationRecord & { archived_at: string };
export type LastIntakePerMed = { medication_id: string; last_logged_at: string | null };

export const medicationKeys = {
  all: ["medications"] as const,
  list: () => [...medicationKeys.all] as const,
  archived: () => [...medicationKeys.all, "archived"] as const,
  intakesToday: () => [...medicationKeys.all, "intakes", "today"] as const,
  intakesLastPerMed: () => [...medicationKeys.all, "intakes", "last-per-med"] as const,
};

export const medicationsApi = {
  getList: () => http.get<MedicationRecord[]>("/medications"),
  getArchived: () => http.get<ArchivedMedication[]>("/medications/archived"),
  create: (body: SaveMedicationInput) => http.post("/medications", body),
  update: (id: string, body: SaveMedicationInput) => http.put(`/medications/${id}`, body),
  remove: (id: string) => http.delete(`/medications/${id}`),
  reorder: (ids: string[]) => http.put("/medications/reorder", { ids }),
  unarchive: (id: string) => http.post<{ ok: boolean }>(`/medications/${id}/unarchive`, {}),
  saveIntake: (body: SaveMedicationIntakeInput) =>
    http.post<{ ok: boolean }>("/medications/intakes", body),
  getLastIntakePerMed: () => http.get<LastIntakePerMed[]>("/medications/intakes/last-per-med"),
  getTodayIntakes: () => http.get<TodayIntake[]>("/medications/intakes/today"),
  deleteIntake: (id: string) => http.delete(`/medications/intakes/${id}`),
};

export function useMedications() {
  return useQuery({ queryKey: medicationKeys.list(), queryFn: medicationsApi.getList });
}

export function useTodayIntakes() {
  return useQuery({ queryKey: medicationKeys.intakesToday(), queryFn: medicationsApi.getTodayIntakes });
}
