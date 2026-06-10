import { http } from "@/lib/http";
import type { Me, UpdateMeBody } from "./types";

export const userApi = {
  getMe: () => http.get<Me>("/user/me"),
  updateMe: (body: UpdateMeBody) =>
    http.put<{ token?: string } & Record<string, unknown>>("/user/me", body),
  revokeSessions: () => http.post<{ ok: boolean }>("/user/revoke-sessions", {}),
};
