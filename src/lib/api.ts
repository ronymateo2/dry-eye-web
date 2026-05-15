import type { SaveDropInput, SaveHygieneInput, SaveOccurrenceInput, SaveMedicationInput, SaveMedicationIntakeInput, SaveTherapySessionInput, TherapySessionRecord, TherapyCorrelation, HistoryFeed, DropScheduleEntry, DropTypeStats, CalendarStatus, CalendarEventEntry, SaveSymptomEntryInput, SymptomStatusToday, SymptomEntryRecord } from "@/types/domain";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("weqe_token");
}

export function setToken(token: string): void {
  localStorage.setItem("weqe_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("weqe_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/";
    }
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // Named endpoints
  getMe: () => api.get<{ id: string; name: string | null; email: string | null; image: string | null; timezone: string; theme: "dark" | "light"; font: "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded" | null }>("/user/me"),
  updateMe: (body: { timezone?: string; name?: string; theme?: "dark" | "light"; font?: "atkinson-hyperlegible" | "manrope" | "sf-pro-rounded" }) => api.put<{ token?: string } & Record<string, unknown>>("/user/me", body),

  saveCheckIn: (body: unknown) => api.post("/check-ins", body),
  getLastCheckIn: () =>
    api.get<{
      id: string;
      logged_at: string;
      time_of_day: string | null;
      eyelid_pain: number;
      temple_pain: number;
      masseter_pain: number;
      cervical_pain: number;
      orbital_pain: number;
      stress_level: number;
      trigger_type: string | null;
      trigger_types: string | null;
      pain_quality: string | null;
      notes: string | null;
    } | null>("/check-ins/last"),

  getDropTypes: () => api.get<{ id: string; name: string; sort_order: number | null; interval_hours: number | null; start_date: string | null; end_date: string | null; suspension_note: string | null; is_vial: boolean; vial_duration: number | null; quick_action: boolean }[]>("/drop-types"),
  createDropType: (name: string, intervalHours: number | null, startDate?: string | null, endDate?: string | null, suspensionNote?: string | null, isVial?: boolean, vialDuration?: number | null, quickAction?: boolean) =>
    api.post<{ id: string; name: string }>("/drop-types", { name, intervalHours, startDate, endDate, suspensionNote, isVial, vialDuration, quickAction }),
  updateDropType: (id: string, body: { intervalHours?: number | null; startDate?: string | null; endDate?: string | null; suspensionNote?: string | null; isVial?: boolean; vialDuration?: number | null; quickAction?: boolean }) =>
    api.put(`/drop-types/${id}`, body),
  updateDropTypeInterval: (id: string, intervalHours: number | null) => api.put(`/drop-types/${id}`, { intervalHours }),
  deleteDropType: (id: string) => api.delete(`/drop-types/${id}`),
  reorderDropTypes: (ids: string[]) => api.put("/drop-types/reorder", { ids }),
  getArchivedDropTypes: () => api.get<{ id: string; name: string; sort_order: number | null; interval_hours: number | null; start_date: string | null; end_date: string | null; suspension_note: string | null; archived_at: string; is_vial: boolean; vial_duration: number | null }[]>("/drop-types/archived"),
  unarchiveDropType: (id: string) => api.post<{ ok: boolean }>(`/drop-types/${id}/unarchive`, {}),

  saveDrop: (body: SaveDropInput) => api.post("/drops", body),
  deleteDrop: (id: string) => api.delete(`/drops/${id}`),
  getLastDrop: () => api.get<{ id: string; logged_at: string; quantity: number; eye: string; drop_type_name: string; drop_type_id: string } | null>("/drops/last"),
  getLastDropPerType: () => api.get<DropScheduleEntry[]>("/drops/last-per-type"),
  getDropStatsPerType: () => api.get<DropTypeStats[]>("/drops/stats-per-type"),
  getRecentDrops: (dropTypeId: string, hours: number, opts?: { hasVial?: boolean }) =>
    api.get<{ id: string; logged_at: string; quantity: number; eye: string }[]>(`/drops/recent?dropTypeId=${dropTypeId}&hours=${hours}${opts?.hasVial ? "&hasVial=true" : ""}`),
  getRecentDropsAll: (hours: number) =>
    api.get<{ id: string; logged_at: string; quantity: number; eye: string }[]>(`/drops/recent?hours=${hours}`),

  getTodaySleep: () => api.get<{ id: string; day_key: string; logged_at: string; sleep_hours: number; sleep_quality: string } | null>("/sleep/today"),
  saveSleep: (body: unknown) => api.put("/sleep", body),

  saveHygiene: (body: SaveHygieneInput) => api.post<{ ok: boolean; dayKey: string }>("/hygiene", body),
  getTodayHygiene: () => api.get<{ today: unknown | null; stats: unknown | null }>("/hygiene/today"),
  getHygieneDashboard: () =>
    api.get<{
      firstDayKey: string | null;
      totalCompletedDays: number;
      todayCompletedCount: number;
      recentRecords: import("@/types/domain").HygieneRecord[];
    }>("/hygiene/dashboard"),
  getHygieneSessions: () =>
    api.get<{ sessions: import("@/types/domain").HygieneRecord[] }>("/hygiene/sessions"),

  saveTrigger: (body: unknown) => api.post("/triggers", body),
  saveSymptom: (body: unknown) => api.post("/symptoms", body),

  saveSymptomEntry: (body: SaveSymptomEntryInput) =>
    api.post<{ ok: boolean; calculated_state: string }>("/symptoms/entries", body),
  getSymptomStatusToday: () => api.get<SymptomStatusToday & { ok: boolean }>("/symptoms/today"),
  getSymptomEntries: (params?: { from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<{ ok: boolean; entries: SymptomEntryRecord[]; hasMore: boolean }>(
      `/symptoms/entries${q ? `?${q}` : ""}`,
    );
  },

  getObservations: () => api.get<import("@/types/domain").ObservationRecord[]>("/observations"),
  getObservationOccurrences: (params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    const q = qs.toString();
    return api.get<{
      ok: boolean;
      occurrences: import("@/types/domain").OccurrenceRecord[];
      hasMore: boolean;
    }>(`/observations/occurrences${q ? `?${q}` : ""}`);
  },
  getObservationPrevious: (observationId: string, limit = 3) =>
    api.get<import("@/types/domain").PrevOccurrence[]>(`/observations/${observationId}/occurrences?limit=${limit}`),
  searchObservations: (q: string) => api.get<(import("@/types/domain").ObservationRecord & { matched_notes: { note: string; logged_at: string }[] | null })[]>(`/observations/search?q=${encodeURIComponent(q)}`),
  createObservation: (body: { title: string; eye?: string; body_zone?: string | null; body_zone_custom?: string | null; category?: string | null; propertiesSchema?: import("@/types/domain").PropertyDef[] }) => api.post<import("@/types/domain").ObservationRecord>("/observations", body),
  updateObservation: (id: string, body: { title?: string; eye?: string; body_zone?: string | null; body_zone_custom?: string | null; category?: string | null; propertiesSchema?: import("@/types/domain").PropertyDef[] }) => api.put<import("@/types/domain").ObservationRecord>(`/observations/${id}`, body),
  deleteObservation: (id: string) => api.delete(`/observations/${id}`),
  saveOccurrence: (observationId: string, body: Omit<SaveOccurrenceInput, "observationId">) =>
    api.post(`/observations/${observationId}/occurrences`, body),

  getMedications: () => api.get<{ id: string; name: string; dosage: string | null; frequency: string | null; notes: string | null; sort_order: number | null; start_date: string | null; end_date: string | null; phases_json: string | null; times_json: string | null }[]>("/medications"),
  createMedication: (body: SaveMedicationInput) => api.post("/medications", body),
  updateMedication: (id: string, body: SaveMedicationInput) => api.put(`/medications/${id}`, body),
  deleteMedication: (id: string) => api.delete(`/medications/${id}`),
  reorderMedications: (ids: string[]) => api.put("/medications/reorder", { ids }),
  getArchivedMedications: () => api.get<{ id: string; name: string; dosage: string | null; frequency: string | null; notes: string | null; sort_order: number | null; start_date: string | null; end_date: string | null; phases_json: string | null; times_json: string | null; archived_at: string }[]>("/medications/archived"),
  unarchiveMedication: (id: string) => api.post<{ ok: boolean }>(`/medications/${id}/unarchive`, {}),

  saveMedicationIntake: (body: SaveMedicationIntakeInput) => api.post<{ ok: boolean }>("/medications/intakes", body),
  getLastIntakePerMedication: () => api.get<{ medication_id: string; last_logged_at: string | null }[]>("/medications/intakes/last-per-med"),
  getTodayMedicationIntakes: () => api.get<{ id: string; medication_id: string; logged_at: string; dosage_taken: string | null; notes: string | null }[]>("/medications/intakes/today"),
  deleteMedicationIntake: (id: string) => api.delete(`/medications/intakes/${id}`),

  getCalendarStatus: () => api.get<CalendarStatus>("/calendar/status"),
  getCalendarEventsToday: () => api.get<{ events: CalendarEventEntry[] }>("/calendar/events/today"),
  syncCalendarDay: (dropTypeId: string, dayKey: string, fromLoggedAt: string) =>
    api.post<{ ok: boolean; events_created?: number; skipped?: boolean; reason?: string }>(
      "/calendar/sync-day",
      { dropTypeId, dayKey, fromLoggedAt },
    ),
  reprocessCalendarDay: (dropTypeId: string, dayKey: string) =>
    api.post<{ ok: boolean; skipped?: boolean; reason?: string }>(
      "/calendar/reprocess",
      { dropTypeId, dayKey },
    ),

  saveTherapySession: (input: SaveTherapySessionInput) =>
    api.post<{ ok: boolean }>("/therapy-sessions", { id: input.id, loggedAt: input.loggedAt, therapyType: input.therapyType, notes: input.notes }),
  getTherapySessions: (before?: string) => {
    const qs = before ? `?before=${before}` : "";
    return api.get<{ ok: boolean; sessions: TherapySessionRecord[] }>(`/therapy-sessions${qs}`);
  },

  getDashboardSummary: () => api.get<{ ok: true; [key: string]: unknown }>("/dashboard/summary"),
  getDashboardCorrelations: () => api.get<{ ok: true; therapyCorrelation: TherapyCorrelation | null; [key: string]: unknown }>("/dashboard/correlations"),
  getHistory: () => api.get<HistoryFeed>("/history"),
  getHistoryMore: (before: string, limit = 5) =>
    api.get<HistoryFeed>(`/history/more?before=${before}&limit=${limit}`),
  getReport: () => api.get<{ ok: true; medications: { name: string; dosage: string | null; start_date: string | null; end_date: string | null; phases_json: string | null }[]; [key: string]: unknown }>("/report"),

  getActiveVials: () => api.get<{
    id: string;
    drop_type_id: string;
    drop_type_name: string;
    started_at: string;
    ended_at: string | null;
    status: string;
    vial_duration: number | null;
  }[]>("/vials/active"),
  createVial: (body: { id: string; dropTypeId: string; startedAt: string; dropId?: string }) =>
    api.post<{ ok: boolean; id: string }>("/vials", body),
  getVialHistory: (params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    const q = qs.toString();
    return api.get<{ ok: boolean; vials: { id: string; drop_type_id: string; drop_type_name: string; started_at: string; ended_at: string | null; status: string; vial_duration: number | null }[]; hasMore: boolean }>(`/vials/history${q ? `?${q}` : ""}`);
  },
  discardVial: (id: string) => api.put<{ ok: boolean }>(`/vials/${id}/discard`, {}),
  deleteVial: (id: string) => api.delete<{ ok: boolean }>(`/vials/${id}`),
};
