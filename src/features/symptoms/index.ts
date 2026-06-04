import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { SaveSymptomEntryInput, SymptomStatusToday, SymptomEntryRecord } from "@/types/domain";

export const symptomKeys = {
  all: ["symptoms"] as const,
  today: () => [...symptomKeys.all, "today"] as const,
};

export const symptomsApi = {
  getStatusToday: () => http.get<SymptomStatusToday & { ok: boolean }>("/symptoms/today"),
  saveEntry: (body: SaveSymptomEntryInput) =>
    http.post<{ ok: boolean; calculated_state: string }>("/symptoms/entries", body),
  getEntries: (params?: { from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return http.get<{ ok: boolean; entries: SymptomEntryRecord[]; hasMore: boolean }>(
      `/symptoms/entries${q ? `?${q}` : ""}`,
    );
  },
  saveLegacy: (body: unknown) => http.post("/symptoms", body),
};

export function useSymptomStatusToday() {
  return useQuery({ queryKey: symptomKeys.today(), queryFn: symptomsApi.getStatusToday });
}
