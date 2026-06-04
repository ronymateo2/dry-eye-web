import { http } from "@/lib/http";
import type { SaveHygieneInput, HygieneRecord } from "@/types/domain";

export const hygieneApi = {
  save: (body: SaveHygieneInput) => http.post<{ ok: boolean; dayKey: string }>("/hygiene", body),
  getToday: () => http.get<{ today: unknown | null; stats: unknown | null }>("/hygiene/today"),
  getDashboard: () =>
    http.get<{
      firstDayKey: string | null;
      totalCompletedDays: number;
      todayCompletedCount: number;
      recentRecords: HygieneRecord[];
    }>("/hygiene/dashboard"),
  getSessions: () => http.get<{ sessions: HygieneRecord[] }>("/hygiene/sessions"),
};
