import { http } from "@/lib/http";
import type {
  SaveDropInput,
  DropScheduleEntry,
  DropTypeStats,
  LastDrop,
  RecentDrop,
  DropTypeFull,
  ArchivedDropType,
  ActiveVial,
  VialHistoryEntry,
  DropTypeUpdate,
} from "./types";

export const dropsApi = {
  // drops
  save: (body: SaveDropInput) => http.post("/drops", body),
  remove: (id: string) => http.delete(`/drops/${id}`),
  getLast: () => http.get<LastDrop | null>("/drops/last"),
  getLastPerType: () => http.get<DropScheduleEntry[]>("/drops/last-per-type"),
  getStatsPerType: (ids?: string[]) =>
    http.get<DropTypeStats[]>(
      `/drops/stats-per-type${ids && ids.length ? `?ids=${encodeURIComponent(ids.join(","))}` : ""}`,
    ),
  getRecent: (dropTypeId: string, hours: number, opts?: { hasVial?: boolean }) =>
    http.get<RecentDrop[]>(
      `/drops/recent?dropTypeId=${dropTypeId}&hours=${hours}${opts?.hasVial ? "&hasVial=true" : ""}`,
    ),
  getToday: () => http.get<RecentDrop[]>("/drops/today"),

  // drop-types
  getTypes: () => http.get<DropTypeFull[]>("/drop-types"),
  getArchivedTypes: () => http.get<ArchivedDropType[]>("/drop-types/archived"),
  createType: (body: {
    name: string;
    intervalHours: number | null;
    startDate?: string | null;
    endDate?: string | null;
    suspensionNote?: string | null;
    isVial?: boolean;
    vialDuration?: number | null;
    quickAction?: boolean;
  }) => http.post<{ id: string; name: string }>("/drop-types", body),
  updateType: (id: string, body: DropTypeUpdate) => http.put(`/drop-types/${id}`, body),
  deleteType: (id: string) => http.delete(`/drop-types/${id}`),
  reorderTypes: (ids: string[]) => http.put("/drop-types/reorder", { ids }),
  unarchiveType: (id: string) => http.post<{ ok: boolean }>(`/drop-types/${id}/unarchive`, {}),

  // vials
  getActiveVials: () => http.get<ActiveVial[]>("/vials/active"),
  createVial: (body: { id: string; dropTypeId: string; startedAt: string; dropId?: string }) =>
    http.post<{ ok: boolean; id: string }>("/vials", body),
  getVialHistory: (params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    const q = qs.toString();
    return http.get<{ ok: boolean; vials: VialHistoryEntry[]; hasMore: boolean }>(
      `/vials/history${q ? `?${q}` : ""}`,
    );
  },
  discardVial: (id: string) => http.put<{ ok: boolean }>(`/vials/${id}/discard`, {}),
  deleteVial: (id: string) => http.delete<{ ok: boolean }>(`/vials/${id}`),
};
