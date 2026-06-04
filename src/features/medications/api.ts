import { http } from "@/lib/http";
import type { MedicationRecord, SaveMedicationInput, SaveMedicationIntakeInput } from "@/types/domain";
import type { ArchivedMedication, LastIntakePerMed, TodayIntake } from "./types";

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
