import { http } from "@/lib/http";
import type { ObservationRecord, OccurrenceRecord, PrevOccurrence, SaveOccurrenceInput } from "@/types/domain";
import type { ObservationBody } from "./types";

export const observationsApi = {
  getList: () => http.get<ObservationRecord[]>("/observations"),
  getOccurrences: (params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    const q = qs.toString();
    return http.get<{ ok: boolean; occurrences: OccurrenceRecord[]; hasMore: boolean }>(
      `/observations/occurrences${q ? `?${q}` : ""}`,
    );
  },
  getPrevious: (observationId: string, limit = 3) =>
    http.get<PrevOccurrence[]>(`/observations/${observationId}/occurrences?limit=${limit}`),
  search: (q: string) =>
    http.get<(ObservationRecord & { matched_notes: { note: string; logged_at: string }[] | null })[]>(
      `/observations/search?q=${encodeURIComponent(q)}`,
    ),
  create: (body: ObservationBody) => http.post<ObservationRecord>("/observations", body),
  update: (id: string, body: Partial<ObservationBody>) =>
    http.put<ObservationRecord>(`/observations/${id}`, body),
  remove: (id: string) => http.delete(`/observations/${id}`),
  saveOccurrence: (observationId: string, body: Omit<SaveOccurrenceInput, "observationId">) =>
    http.post(`/observations/${observationId}/occurrences`, body),
  deleteOccurrence: (observationId: string, occurrenceId: string) =>
    http.delete(`/observations/${observationId}/occurrences/${occurrenceId}`),
};
