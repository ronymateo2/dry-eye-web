import type { SaveDropInput, SaveHygieneInput, SaveOccurrenceInput, SaveMedicationInput, SaveMedicationIntakeInput, SaveTherapySessionInput, TherapySessionRecord, TherapyCorrelation, HistoryFeed, DropScheduleEntry, DropTypeStats, CalendarStatus, CalendarEventEntry } from "@/types/domain";

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
  getMe: () => api.get<{ id: string; name: string | null; email: string | null; image: string | null; timezone: string; theme: "dark" | "light" }>("/user/me"),
  updateMe: (body: { timezone?: string; name?: string; theme?: "dark" | "light" }) => api.put("/user/me", body),

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

  getDropTypes: () => api.get<{ id: string; name: string; sort_order: number | null; interval_hours: number | null; start_date: string | null; end_date: string | null; suspension_note: string | null }[]>("/drop-types"),
  createDropType: (name: string, intervalHours: number | null, startDate?: string | null, endDate?: string | null, suspensionNote?: string | null) =>
    api.post<{ id: string; name: string }>("/drop-types", { name, intervalHours, startDate, endDate, suspensionNote }),
  updateDropType: (id: string, body: { intervalHours?: number | null; startDate?: string | null; endDate?: string | null; suspensionNote?: string | null }) =>
    api.put(`/drop-types/${id}`, body),
  updateDropTypeInterval: (id: string, intervalHours: number | null) => api.put(`/drop-types/${id}`, { intervalHours }),
  deleteDropType: (id: string) => api.delete(`/drop-types/${id}`),
  reorderDropTypes: (ids: string[]) => api.put("/drop-types/reorder", { ids }),

  saveDrop: (body: SaveDropInput) => api.post("/drops", body),
  getLastDrop: () => api.get<{ id: string; logged_at: string; quantity: number; eye: string; drop_type_name: string; drop_type_id: string } | null>("/drops/last"),
  getLastDropPerType: () => api.get<DropScheduleEntry[]>("/drops/last-per-type"),
  getDropStatsPerType: () => api.get<DropTypeStats[]>("/drops/stats-per-type"),

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

  getObservations: () => api.get<{ id: string; title: string; eye: string; notes: string | null; last_logged_at: string | null; occurrence_count: number }[]>("/observations"),
  getObservationOccurrences: (params?: { limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.before) qs.set("before", params.before);
    const q = qs.toString();
    return api.get<{
      ok: boolean;
      occurrences: { id: string; observationId: string; loggedAt: string; intensity: number; durationMinutes: number | null; notes: string | null; title: string; eye: string }[];
      hasMore: boolean;
    }>(`/observations/occurrences${q ? `?${q}` : ""}`);
  },
  createObservation: (body: { title: string; eye?: string; notes?: string }) => api.post("/observations", body),
  deleteObservation: (id: string) => api.delete(`/observations/${id}`),
  saveOccurrence: (observationId: string, body: Omit<SaveOccurrenceInput, "observationId">) => api.post(`/observations/${observationId}/occurrences`, body),

  getMedications: () => api.get<{ id: string; name: string; dosage: string | null; frequency: string | null; notes: string | null; sort_order: number | null; start_date: string | null; end_date: string | null; phases_json: string | null }[]>("/medications"),
  createMedication: (body: SaveMedicationInput) => api.post("/medications", body),
  updateMedication: (id: string, body: SaveMedicationInput) => api.put(`/medications/${id}`, body),
  deleteMedication: (id: string) => api.delete(`/medications/${id}`),
  reorderMedications: (ids: string[]) => api.put("/medications/reorder", { ids }),

  saveMedicationIntake: (body: SaveMedicationIntakeInput) => api.post<{ ok: boolean }>("/medications/intakes", body),
  getLastIntakePerMedication: () => api.get<{ medication_id: string; last_logged_at: string | null }[]>("/medications/intakes/last-per-med"),
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

  getDashboard: () => api.get<{ ok: true; therapyCorrelation: TherapyCorrelation | null; [key: string]: unknown }>("/dashboard"),
  getHistory: () => api.get<HistoryFeed>("/history"),
  getHistoryMore: (before: string, limit = 5) =>
    api.get<HistoryFeed>(`/history/more?before=${before}&limit=${limit}`),
  getReport: () => api.get<{ ok: true; medications: { name: string; dosage: string | null; start_date: string | null; end_date: string | null; phases_json: string | null }[]; [key: string]: unknown }>("/report"),
};
