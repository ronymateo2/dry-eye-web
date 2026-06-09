import { http } from "@/lib/http";

export type PushPreferences = {
  enabled?: boolean;
  quietStart?: string | null;
  quietEnd?: string | null;
};

export const notificationsApi = {
  getVapidKey: () => http.get<{ key: string }>("/push/vapid-public-key"),
  subscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    http.post<{ ok: true }>("/push/subscribe", sub),
  unsubscribe: (endpoint: string) =>
    http.delete<{ ok: true }>(`/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`),
  updatePreferences: (body: PushPreferences) =>
    http.put<{ ok: true }>("/push/preferences", body),
};
