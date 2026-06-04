import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type {
  ObservationRecord,
  OccurrenceRecord,
  PrevOccurrence,
  PropertyDef,
  SaveOccurrenceInput,
} from "@/types/domain";

export const observationKeys = {
  all: ["observations"] as const,
  list: () => [...observationKeys.all] as const,
  search: (q: string) => [...observationKeys.all, "search", q] as const,
  occurrences: () => [...observationKeys.all, "occurrences"] as const,
  prevAll: () => [...observationKeys.all, "prev"] as const,
  prev: (id: string) => [...observationKeys.all, "prev", id] as const,
  prevDetail: (id: string) => [...observationKeys.all, "prev", id, "detail"] as const,
};

type ObservationBody = {
  title: string;
  eye?: string;
  body_zone?: string | null;
  body_zone_custom?: string | null;
  category?: string | null;
  propertiesSchema?: PropertyDef[];
  useIntensity?: boolean;
  useDuration?: boolean;
};

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

export function useObservations() {
  return useQuery({ queryKey: observationKeys.list(), queryFn: observationsApi.getList });
}
