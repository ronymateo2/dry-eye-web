import { http } from "@/lib/http";
import type { SaveTherapySessionInput, TherapySessionRecord } from "@/types/domain";

export const therapyApi = {
  saveSession: (input: SaveTherapySessionInput) =>
    http.post<{ ok: boolean }>("/therapy-sessions", {
      id: input.id,
      loggedAt: input.loggedAt,
      therapyType: input.therapyType,
      notes: input.notes,
    }),
  getSessions: (before?: string) => {
    const qs = before ? `?before=${before}` : "";
    return http.get<{ ok: boolean; sessions: TherapySessionRecord[] }>(`/therapy-sessions${qs}`);
  },
};
